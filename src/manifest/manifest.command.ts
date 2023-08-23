import { Command } from "commander";
import { manifestCreateCommand } from "./manifest-create.command";

export const manifestCommand = new Command("manifest");
manifestCommand
  .description('Manage Golem manifest.')
  .addCommand(manifestCreateCommand)
;


