import { Command } from "commander";
import { manifestCreateCommand } from "./manifest-create.command";
import { manifestNetCommand } from "./net/manifest-net.command";
import { manifestVerifyCommand } from "./manifest-verify.command";
import { manifestSignCommand } from "./manifest-sign.command";

export const manifestCommand = new Command("manifest");
manifestCommand
  .description('Manage Golem manifest.')
  .addCommand(manifestCreateCommand)
  .addCommand(manifestNetCommand)
  .addCommand(manifestSignCommand)
  .addCommand(manifestVerifyCommand)
;


