import { Command } from "commander";
import { ShellOptions } from "./shell.options";

/*

Issues limiting this idea:
- TaskExecutor registers it's own SIGINT handler!
- TaskExecutor is unable to deliver in a procedural way an instance of WorkContext to the user.
- No streaming of standard I/O
- Remove WARN on command errors (using some option)

TODO:
[x] Add time command
[x] Add upload command
[x] Add download command
[x] Add set command
[x] Implement batch files
[x] Add --timout option
[ ] Handle activity error, right now it's just ignored
[x] Handle stdout redirect

FIXME: Activity error, timeout, whatever, doesn't terminate the shell.
FIXME: Non 0 exit code triggers the SDK to output a warning log message.

More features ideas:
[ ] Exec command using argument array (with program binary) instead of shell (run(['/bin/echo', 'Hello']) vs run('echo "Hello"'))
[x] Add -e|--exec to directly provide commands to execute
[x] Add -i|--interactive to start interactive shell even if commands are provided (through batch file and/or --exec)
[ ] Set SDK's log level from CLI options
[ ] Implement || and && operators for primitive conditional support?
[ ] Input stream for tokens, so commands can span multiple lines.
[ ] Give the ability to extend timeout from the shell. This could set timeout to infinity and then use "client side" extensible timeout
[ ] Ability to execute an interactive shell on the provider (requires streaming I/O)
[ ] connect/disconnect commands to connect/disconnect from the provider
[ ] History of commands
[ ] Simple autocomplete of commands
[ ] Advanced autocomplete for local files for upload/download
[x] Add option to not include env variables into the shell (-n)
[ ] Display nicely total cost of session at the end of the session (or on disconnect)
[ ] --silent so the shell doesn't use any stdout by itself
 */

export const shellCommand = new Command("shell");

shellCommand
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
  .argument("[file...]", "Batch files to execute, exit after execution.")
  .addHelpText(
    "after",
    "\nIf both --execute and batch files are provided, first batch files are executed, then --execute." +
      "\n\nIf either --execute or batch files are used, upon completion of the commands, the shell will exit. This behaviour can be changed by using --interactive option.",
  )
  .allowExcessArguments(false)
  .action(async (file: string[], options: ShellOptions) => {
    const action = await import("./shell.action.js");
    await action.default.shellAction(file, options);
  });
