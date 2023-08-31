import { Command } from "commander";
import { createManifestOption } from "./common";

export const manifestSignCommand = new Command("sign");
manifestSignCommand
  .description('Sign Golem manifest file.')
  .addOption(createManifestOption())
  .option('-k, --key-file <file>', 'Private key file.')
  .option('-s, --signature-file <file>', 'Signature file.', 'manifest.sig')
  .action(async (options: any) => {
    const action = await import("./manifest-sign.action");
    await action.manifestSignAction(options);
  })
;

