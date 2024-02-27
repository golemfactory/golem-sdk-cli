import { RunOnGolemOptions } from "./run-on-golem.options";
import { createInterface } from "readline/promises";
import { parse, ParseEntry } from "shell-quote";
import { CommanderError } from "commander";
import { ParseError, ShellError } from "./errors";
import { ExecutorOptions, TaskExecutor, TaskExecutorEventsDict } from "@golem-sdk/task-executor";
import { assertFileExists, checkFileExists } from "../lib/file";
import { readFile } from "fs/promises";
import { TaskAPIContext, VarsType } from "./shell-context";
import * as fs from "fs";
import * as readline from "readline";
import { Events } from "@golem-sdk/golem-js";
import { shellProgram } from "./shell-program";
import { EventEmitter } from "eventemitter3";

enum OutputMode {
  APPEND = 1,
  WRITE,
}

type ParseResult = {
  arguments: string[];
  stdoutMode?: OutputMode;
  stdout?: string;
};

// TODO: Pass context (file, line number) for better error handling.
function parseTokens(tokens: ParseEntry[]): ParseResult[] {
  const results: ParseResult[] = [];
  let current: ParseResult = {
    arguments: [],
  };

  let token: ParseEntry | undefined;
  // let nextToken: ParseEntry | null = null;

  while ((token = tokens.shift())) {
    // nextToken = tokens[0] || null;

    if (typeof token === "string") {
      current.arguments.push(token);
    } else if ("comment" in token) {
      // Comment always ends the line
      break;
    } else if ("op" in token) {
      switch (token.op) {
        // case ">":
        //   current.stdoutMode = OutputMode.WRITE;
        //   if (typeof nextToken !== "string" || !nextToken.length) {
        //     throw new ParseError("Missing file name after >");
        //   }
        //   current.stdout = tokens.shift() as string;
        //   break;
        // case ">>":
        //   current.stdoutMode = OutputMode.APPEND;
        //   if (typeof nextToken !== "string" || !nextToken.length) {
        //     throw new ParseError("Missing file name after >>");
        //   }
        //   current.stdout = tokens.shift() as string;
        //   break;
        case ";":
          if (current.arguments.length) {
            results.push(current);
          }
          current = {
            arguments: [],
          };
          break;
        default:
          throw new ParseError("Unsupported operator: " + token.op);
      }
    }
  }

  if (current.arguments.length) {
    results.push(current);
  }

  return results;
}

async function execCommand(context: TaskAPIContext, cmd: ParseResult) {
  try {
    // Cannot call parse()/parseAsync() multiple times on the same command object, due to an ignored bug:
    // https://github.com/tj/commander.js/issues/841
    const program = shellProgram(context);
    await program.parseAsync(cmd.arguments, { from: "user" });
  } catch (e) {
    if (e instanceof ShellError) {
      console.error(`Error: ${e.message}`);
    } else if (e instanceof CommanderError) {
      // if (e.code === "commander.helpDisplayed") {
      // } else {
      //   console.error(`Error: ${e.message}`);
      // }
    } else {
      console.error(e);
    }
  }
}

function handleHelp(line: string): ParseEntry[] | undefined {
  if (line === "?") {
    return ["help"];
  }

  return undefined;
}

async function execLine(context: TaskAPIContext, line: string) {
  const tokens = handleHelp(line) ?? parse(line, context.vars);
  let commands: ParseResult[];
  try {
    commands = parseTokens(tokens);
  } catch (e) {
    if (e instanceof ShellError) {
      console.error(e.message);
      return;
    } else {
      throw e;
    }
  }

  for (const cmd of commands) {
    await execCommand(context, cmd);
    if (context.exited) {
      return;
    }
  }
}

async function execFile(context: TaskAPIContext, file: string): Promise<void> {
  await assertFileExists("Script file", file);
  const lines: string[] = [];

  await new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file);
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    rl.on("line", (line) => {
      lines.push(line);
    });
    rl.on("close", () => {
      resolve(0);
    });
    rl.on("error", (e) => {
      reject(e);
    });
  });

  for (const line of lines) {
    await execLine(context, line);
  }
}

function execConsole(context: TaskAPIContext): Promise<void> {
  console.log("Type ? for help, exit to end the session.");
  return new Promise<void>((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true, // process.stdout.isTTY,
      prompt: "golem> ",
    });
    rl.prompt();
    rl.on("line", (line) => {
      rl.pause();
      execLine(context, line)
        .then(() => {
          if (context.exited) {
            rl.close();
            resolve();
          } else {
            rl.prompt();
          }
        })
        .catch((e) => reject(e));
    });
  });
}

async function createExecutor(options: RunOnGolemOptions) {
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 60 * 60;
  const opts: ExecutorOptions = {
    taskTimeout: 1000 * timeout,
    skipProcessSignals: true,
  };

  if (options.image) {
    console.log(`Creating executor using image ${options.image}`);
    opts.package = options.image;
  } else {
    console.log(`Creating task executor using manifest file ${options.manifest}`);
    if (!(await checkFileExists("Manifest file", options.manifest))) {
      console.log("You can create a manifest file by running:\n\n\tgolem-sdk manifest create\n");
      console.log(
        "You can specify a manifest file to use by using the --manifest option:" +
          "\n\n\tgolem-sdk run-on-golem --manifest <manifest>\n",
      );
      console.log(
        "If you want to use an image directly instead of a manifest file, use the --image option:" +
          "\n\n\tgolem-sdk run-on-golem --image <image>\n",
      );
      process.exit(1);
    }

    // TODO: add option for signed manifests.
    opts.manifest = (await readFile(options.manifest)).toString("base64");
    opts.capabilities = ["manifest-support"];
  }

  return TaskExecutor.create(opts);
}

function installSignalHandlers(context: TaskAPIContext, events: EventEmitter<TaskExecutorEventsDict>) {
  const signals = ["SIGINT", "SIGTERM", "SIGBREAK"];
  let terminating = false;

  const handler = async (signal: string) => {
    // Can only be called once, repeated signals will be ignored.
    if (terminating) return;
    terminating = true;

    console.log(`${signal} received, terminating shell...`);

    // Terminate the context.
    if (!context.terminated) {
      await context.terminate();
    }

    // Exit shell.
    process.exit(0);
  };

  signals.forEach((signal) => {
    process.on(signal, handler);
  });

  // This is used to detect if the activity was terminated by the provider, error or timeout.
  // If it is, TaskExecutor is already shutting down. Make sure we terminate the shell.
  events.on("golemEvents", async (e) => {
    if (e instanceof Events.ActivityDestroyed) {
      // This will happen on activity timeout
      if (terminating || context.exited) return;
      terminating = true;
      console.log("Activity destroyed, terminating shell...");

      await context.terminate();

      process.exit(0);
    }
  });

  events.on("taskFailed", async () => {
    // This will happen on activity timeout and when executor times out waiting for offers
    if (terminating || context.exited) return;
    terminating = true;
    console.log("Terminating shell...");

    await context.terminate();

    process.exit(0);
  });
}

export async function runOnGolemAction(files: string[], options: RunOnGolemOptions) {
  // Prepare shell variables.
  const vars: VarsType = {
    ...(options.env ? process.env : {}),
  };

  // Create task executor.
  const executor = await createExecutor(options);
  const context = new TaskAPIContext(executor, vars);
  installSignalHandlers(context, executor.events);

  try {
    // Do magic so we have a work context.
    await context.magic();

    // Execute files.
    for (const file of files) {
      await execFile(context, file);
    }

    // Execute commands from CLI
    if (options.execute) {
      await execLine(context, options.execute);
    }

    // Go to interactive shell if working in interactive mode.
    if ((!options.execute && !files.length) || options.interactive) {
      await execConsole(context);
    }
  } catch (e) {
    console.error(e);
  } finally {
    console.log("Terminating task executor...");
    await context.terminate();
  }
}
