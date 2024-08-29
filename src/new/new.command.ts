import { Command } from "commander";
import { NewOptions } from "./new.options";

export const newCommand = new Command("new");

newCommand
  .summary("Create new Golem project.")
  .description("Create a new Golem project from template.")
  .option("-p, --path <path>", "Path of the new project.")
  .option("-t, --template <template>", "Template to be used for the project.")
  .option("-d, --description <text>", "Description of the project.")
  .option("-a, --author <name>", "Author of the project.") // TODO: try to read it from git config?
  .option("-v, --app-version <version>", "Version of the project.")
  .option("-y, --yes", 'Automatically answer "yes" to optional prompts that installer might print on the command line')
  .option("--skip-install", "Do not install dependencies.")
  // TODO: implement list-templates?
  // .option("-l, --list-templates", "List available project templates.")
  .argument("[name]", "Name of the project.")
  .action(async (name: string, options: NewOptions) => {
    const action = await import("./new.action.js");
    await action.default.newAction(name, options);
  });
