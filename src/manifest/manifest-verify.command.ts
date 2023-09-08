import { Command } from "commander";
import { createManifestOption } from "./common";
import { ManifestVerifyOptions } from "./manifest-verify.options";

export const manifestVerifyCommand = new Command("verify");
manifestVerifyCommand
  .summary("Verify manifest file.")
  .description("Verify manifest file for correctness and verify it's signature.")
  .addOption(createManifestOption())
  .option("-c, --certificate-file <file>", "Certificate file.", "manifest.cert")
  .option("-s, --signature-file <file>", "Signature file (base64 encoded).", "manifest.sig")
  .action(async (options: ManifestVerifyOptions) => {
    const action = await import("./manifest-verify.action.js");
    await action.manifestVerifyAction(options);
  });
