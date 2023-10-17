import { RunOnGolemOptions } from "./run-on-golem.options";
import { createInterface } from "readline/promises";
import { parse, ParseEntry } from "shell-quote";
import { CommanderError } from "commander";
import { ParseError, ShellError } from "./errors";
import { ExecutorOptions, TaskExecutor } from "@golem-sdk/golem-js";
import { assertFileExists, checkFileExists } from "../lib/file";
import { readFile } from "fs/promises";
import { TaskAPIContext, VarsType } from "./shell-context";
import * as fs from "fs";
import * as readline from "readline";

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
  let nextToken: ParseEntry | null = null;

  while ((token = tokens.shift())) {
    nextToken = tokens[0] || null;

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
    await context.program.parseAsync(cmd.arguments, { from: "user" });
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
  }

  return TaskExecutor.create(opts);
}

export async function runOnGolemAction(files: string[], options: RunOnGolemOptions) {
  // Prepare shell variables.
  const vars: VarsType = {
    ...(options.env ? process.env : {}),
  };

  // Create task executor.
  const executor = await createExecutor(options);
  const context = new TaskAPIContext(executor, vars);

  // Handle SIGINT and SIGTERM.
  process.on("SIGINT", async () => {
    console.log("SIGINT received, terminating shell...");
    if (!context.terminated) {
      await context.terminate();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, terminating shell...");
    if (!context.terminated) {
      await context.terminate();
    }
    process.exit(0);
  });

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
