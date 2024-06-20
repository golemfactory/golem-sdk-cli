import { RunOnGolemOptions } from "./run-on-golem.options";
import { createInterface } from "readline/promises";
import { parse, ParseEntry } from "shell-quote";
import { CommanderError } from "commander";
import { ParseError, ShellError } from "./errors";
import { assertFileExists, checkFileExists } from "../lib/file";
import { readFile } from "fs/promises";
import { ProcessEnvVars, ProcessContext } from "./shell-context";
import * as fs from "fs";
import * as readline from "readline";
import { GolemNetwork, ResourceRental, MarketOrderSpec } from "@golem-sdk/golem-js";
import { shellProgram } from "./shell-program";

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

async function execCommand(rental: ResourceRental, context: ProcessContext, cmd: ParseResult) {
  try {
    // Cannot call parse()/parseAsync() multiple times on the same command object, due to an ignored bug:
    // https://github.com/tj/commander.js/issues/841
    const program = shellProgram(rental, context);
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

async function execLine(rental: ResourceRental, processContext: ProcessContext, line: string) {
  const tokens = handleHelp(line) ?? parse(line, processContext.env);
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
    await execCommand(rental, processContext, cmd);
    if (processContext.metadata.terminating) {
      return;
    }
  }
}

async function execFile(rental: ResourceRental, context: ProcessContext, file: string): Promise<void> {
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
    await execLine(rental, context, line);
  }
}

function execConsole(rental: ResourceRental, processContext: ProcessContext): Promise<void> {
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
      execLine(rental, processContext, line)
        .then(() => {
          if (processContext.metadata.terminating) {
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

async function createMarketOrder(options: RunOnGolemOptions): Promise<MarketOrderSpec> {
  const timeout = options.timeout ? parseInt(options.timeout, 10) : 60 * 60;

  const market: MarketOrderSpec["market"] = {
    rentHours: timeout / 3600,
    pricing: {
      model: "burn-rate",
      avgGlmPerHour: options.price ? parseFloat(options.price) : 1.0,
    },
  };

  if (options.image) {
    console.log(`Publishing order using image ${options.image}`);
    return {
      demand: {
        expirationSec: timeout,
        workload: {
          imageTag: options.image,
        },
      },
      market,
    };
  }
  console.log(`Publishing order using manifest file ${options.manifest}`);
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
  return {
    demand: {
      workload: {
        manifest: (await readFile(options.manifest)).toString("base64"),
        capabilities: ["manifest-support"],
      },
    },
    market,
  };
}

function installSignalHandlers(rental: ResourceRental, glm: GolemNetwork, context: ProcessContext) {
  const signals = ["SIGINT", "SIGTERM", "SIGBREAK"];
  let terminating = false;

  const handler = async (signal: string) => {
    // Can only be called once, repeated signals will be ignored.
    if (terminating) return;
    terminating = true;

    console.log(`${signal} received, terminating shell...`);

    await rental.stopAndFinalize();

    // Exit shell.
    process.exit(0);
  };

  signals.forEach((signal) => {
    process.on(signal, handler);
  });

  // This is used to detect if the activity was terminated by the provider, error or timeout.
  // If it is, TaskExecutor is already shutting down. Make sure we terminate the shell.
  glm.activity.events.on("activityDestroyed", async () => {
    // This will happen on activity timeout
    if (terminating || context.metadata.terminating) return;
    terminating = true;
    console.log("Activity destroyed, terminating shell...");

    await rental.stopAndFinalize();

    process.exit(0);
  });
}

export async function runOnGolemAction(files: string[], options: RunOnGolemOptions) {
  // Prepare shell variables.
  const env: ProcessEnvVars = {
    ...(options.env ? process.env : {}),
  };
  const metadata = {
    activityStart: new Date(),
    terminating: false,
  };
  const context: ProcessContext = {
    env,
    metadata,
  };
  const glm = new GolemNetwork();
  await glm.connect();

  try {
    const order = await createMarketOrder(options);
    const rental = await glm.oneOf({ order });
    // force deploy activity on the provider
    await rental.getExeUnit();
    context.metadata.activityStart = new Date();

    // Install process signal handlers.
    installSignalHandlers(rental, glm, context);

    // Execute files.
    for (const file of files) {
      await execFile(rental, context, file);
    }

    // Execute commands from CLI
    if (options.execute) {
      await execLine(rental, context, options.execute);
    }

    // Go to interactive shell if working in interactive mode.
    if ((!options.execute && !files.length) || options.interactive) {
      await execConsole(rental, context);
    }
  } catch (e) {
    console.error(e);
  } finally {
    console.log("Disconnecting from Golem Network...");
    await glm.disconnect();
  }
}
