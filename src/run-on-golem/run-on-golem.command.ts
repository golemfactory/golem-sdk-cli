import { Command } from "commander";
import { RunOnGolemOptions } from "./run-on-golem.options";

export const runOnGolemCommand = new Command("run-on-golem");

runOnGolemCommand
  .summary("Run task API shell")
  .option(
    "--image <image>",
    "Image to be used in the manifest, identified by URL, image tag or image hash. See README.md for details. If provided, manifest file will not be used.",
  )
  .option("--manifest <manifest>", "Path to manifest file to use.", "manifest.json")
  .option("-e, --execute <command>", "Execute a command and exit.")
  .option("-i, --interactive", "Force interactive mode, even if commands or batch files are provided.")
  .option("-n, --no-env", "Do not include environment variables into the shell.")
  .option("-t, --timeout <timeout>", "Timeout for the activity in seconds. Default: 3600 (1h).", "3600")
  .option("-p, --price <price>", "Maximum price per hour for the activity. Default: 1.0 GLM.", "1.0")
  .argument("[file...]", "Batch files to execute, exit after execution.")
  .addHelpText(
    "after",
    "\nIf both --execute and batch files are provided, first batch files are executed, then --execute." +
      "\n\nIf either --execute or batch files are used, upon completion of the commands, the shell will exit. This behaviour can be changed by using --interactive option.",
  )
  .allowExcessArguments(false)
  .action(async (file: string[], options: RunOnGolemOptions) => {
    const action = await import("./run-on-golem.action.js");
    await action.default.runOnGolemAction(file, options);
  });
