import { Command } from "commander";
import { ManifestNetAddOutboundOptions } from "./manifest-net-add-outbound.options";
import { createManifestOption } from "../common";

export const manifestNetAddOutboundCommand = new Command("add-outbound");

manifestNetAddOutboundCommand
  .summary("Add network outbound configuration to manifest and URLs.")
  .description(
    "Add network outbound configuration to manifest and URLs.\n" +
      "You can run this command multiple times in order to add new URLs to the outbound network configuration.\n" +
      "\nNote: This command needs an existing manifest file.",
  )
  .addOption(createManifestOption())
  .argument("<url...>", "URLs to be added to the manifest.")
  .action(async (urls: string[], options: ManifestNetAddOutboundOptions) => {
    const action = await import("./manifest-net-add-outbound.action");
    await action.manifestNetAddOutboundAction(urls, options);
  });
