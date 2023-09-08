import { Command } from "commander";
import { createManifestOption } from "./common";
import { ManifestSignOptions } from "./manifest-sign.options";

export const manifestSignCommand = new Command("sign");
manifestSignCommand
  .description("Sign Golem manifest file.")
  .addOption(createManifestOption())
  .option("-k, --key-file <file>", "Private key file.")
  .option("-p, --passphrase <passphrase>", "Passphrase for the private key.")
  .option("-s, --signature-file <file>", "Signature file.", "manifest.sig")
  .action(async (options: ManifestSignOptions) => {
    const action = await import("./manifest-sign.action.js");
    await action.default.manifestSignAction(options);
  });
