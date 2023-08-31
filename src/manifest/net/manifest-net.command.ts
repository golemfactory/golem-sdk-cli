import { Command } from "commander";
import { manifestNetAddOutboundCommand } from "./manifest-net-add-outbound.command";

export const manifestNetCommand = new Command("net");
manifestNetCommand
  .description('Manage manifest network configuration.')
  .addCommand(manifestNetAddOutboundCommand)
;
