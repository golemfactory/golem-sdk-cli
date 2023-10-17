import { Command } from "commander";
import { ProgramContext } from "./context-interface";
import { checkDirExists, checkFileExists } from "../lib/file";
import path from "node:path";
import { DateTime } from "luxon";
import { writeFile } from "fs/promises";

export function shellProgram(pContext: ProgramContext): Command {
  const program = new Command("shell");
  program
    .exitOverride()
    .addHelpCommand(false)
    .helpOption(false)
    .enablePositionalOptions(true)
    .configureHelp({
      commandUsage: (cmd: Command) => {
        return `${cmd.name()} ${cmd.usage()}`;
      },
    });

  program
    .command("help")
    .allowExcessArguments(false)
    .description("Display available commands.")
    .argument("[command]", "The command to display help for.")
    .action((command) => {
      if (!command) {
        const help = program.helpInformation();
        // This will remove 'Usage: shell ...' from help output.
        console.log(help.split("\n").slice(2).join("\n"));
      } else {
        const cmd = program.commands.find((c) => c.name() === command);
        if (!cmd) {
          console.error(`Error: Command ${command} not found.`);
          return;
        }

        cmd.outputHelp();
      }
    });

  program
    .command("exit")
    .description("Terminate activity and exit shell.")
    .allowExcessArguments(false)
    .showHelpAfterError("Type `exit --help` form more information.")
    .helpOption(true)
    .action(() => {
      pContext.exited = true;
    });

  program
    .command("echo")
    .description("Display a line of text.")
    .argument("<text...>", "Text to display.")
    .showHelpAfterError("Type `echo --help` form more information.")
    .helpOption(true)
    .action((lines: string[]) => {
      console.log(lines.join(" "));
    });

  program
    .command("set")
    .description("Display or modify shell variables.")
    .argument("[name]", "Variable name or variable assignment (ie. var=VALUE.")
    .allowExcessArguments(false)
    .showHelpAfterError("Type `set --help` form more information.")
    .helpOption(true)
    .action((name?: string) => {
      const parts = name ? name?.split("=") : null;

      if (!name) {
        // Display all variables.
        for (const [key, value] of Object.entries(pContext.vars)) {
          console.log(`${key}=${value ?? ""}`);
        }
      } else if (parts?.length === 1) {
        console.log(`${parts[0]}=${pContext.vars[parts[0]] ?? ""}`);
      } else {
        pContext.vars[parts![0]] = parts![1];
      }
    });

  program
    .command("run")
    .description("Execute a command on the provider using shell.")
    .option("-o, --stdout <file>", "Redirect stdout to a file.")
    .option("-e, --stderr <file>", "Redirect stderr to a file. Use - to redirect stderr to stdout.")
    .argument("<command>", "The command to run on the provider.")
    .addHelpText("after", "\nExamples:\n" + '\t$ run "ls /"\n' + '\t$ run "cat /proc/cpuinfo"\n')
    .allowExcessArguments(false)
    .showHelpAfterError("Type `run --help` form more information.")
    .helpOption(true)
    .action(async (command: string, options) => {
      const result = await pContext.workContext.run(command);
      if (result.result !== "Ok") {
        console.error(`Command error: ${result.message}`);
      }
      // TODO: Handle stdout redirect.
      let stdout = result.stdout as string;
      if (options.stderr === "-") stdout += result.stderr as string;

      if (options.stdout) {
        await writeFile(options.stdout, stdout, { encoding: "utf-8" });
      } else {
        process.stdout.write(result.stdout as string);
      }

      if (options.stderr && options.stderr !== "-") {
        process.stderr.write(result.stderr as string);
      }
    });

  // Needs figuring out how to bypass Commander.js, so it doesn't hijack options.
  // program
  //   .command("exec")
  //   .summary("Execute a command on the provider.")
  //   .option("-o, --stdout <file>", "Redirect stdout to a file.")
  //   .option("-e, --stderr <file>", "Redirect stderr to a file. Use - to redirect stderr to stdout.")
  //   .addHelpText("after", "Use -- after exec options to separate exec options for your application options")
  //   .argument("<executable>", "Path to executable to run.")
  //   .argument("[arguments...]", "Command arguments and options to pass")
  //   .allowUnknownOption(true)
  //   .passThroughOptions(true)
  //   .action(async (command: string, args: string[], options) => {
  //     const result = await pContext.workContext.run(command, args);
  //     if (result.result !== "Ok") {
  //       console.error(`Command error: ${result.message}`);
  //     }
  //     let stdout = result.stdout as string;
  //     if (options.stderr === "-") stdout += result.stderr as string;
  //
  //     if (options.stdout) {
  //       await writeFile(options.stdout, stdout, { encoding: "utf-8" });
  //     } else {
  //       process.stdout.write(result.stdout as string);
  //     }
  //
  //     if (options.stderr && options.stderr !== "-") {
  //       process.stderr.write(result.stderr as string);
  //     }
  //   });

  program
    .command("upload")
    .description("Upload a file to the provider.")
    .argument("<source-file>", "Path to the file to upload.")
    .argument("<destination-file>", "Remote path to upload the file to.")
    .allowExcessArguments(false)
    .showHelpAfterError("Type `upload --help` form more information.")
    .helpOption(true)
    .action(async (sourceFile: string, destinationFile: string) => {
      const exists = await checkFileExists("Source file", sourceFile);
      if (!exists) {
        console.log(`Upload aborted.`);
        return;
      }

      console.log(`Uploading ${sourceFile}...`);
      const result = await pContext.workContext.uploadFile(sourceFile, destinationFile);
      if (result.result === "Ok") {
        console.log("File uploaded.");
      } else {
        console.log(`Failed to upload file: ${result.message}`);
      }
    });

  program
    .command("download")
    .description("Download a file from the provider.")
    .argument("<sourceFile>", "Path to the file to download.")
    .argument(
      "[localPath]",
      "Local path to download the file to. If not provided, file will be saved in current directory using the name from source file.",
    )
    .allowExcessArguments(false)
    .showHelpAfterError("Type `download --help` form more information.")
    .helpOption(true)
    .action(async (sourceFile: string, destinationPath: string) => {
      if (!destinationPath) destinationPath = path.basename(sourceFile);
      const destDir = path.dirname(destinationPath ?? "./");
      const exists = await checkDirExists("Destination directory", destDir);
      if (!exists) {
        console.log(`Download aborted.`);
        return;
      }

      console.log(`Downloading ${sourceFile}...`);
      const result = await pContext.workContext.downloadFile(sourceFile, destinationPath);
      if (result.result === "Ok") {
        console.log("File downloaded.");
      } else {
        console.log(`Failed to download file: ${result.message}`);
      }
    });

  program
    .command("time")
    .description("Displays the amount of time current activity is running on the provider.")
    .allowExcessArguments(false)
    .showHelpAfterError("Type `time --help` form more information.")
    .helpOption(true)
    .action(async () => {
      const start = pContext.startDate;
      const now = Date.now();
      const duration = now - start.getTime();
      const prettyMs = await import("pretty-ms"); // ESM vs CJS nightmare...
      console.log(`Activity started at ${DateTime.fromJSDate(start).toLocaleString(DateTime.DATETIME_MED)}.`);
      console.log(`Activity duration: ${prettyMs.default(duration)}`);
    });

  return program;
}
