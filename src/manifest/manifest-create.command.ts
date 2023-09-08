import { Command } from "commander";
import { ManifestCreateOptions } from "./manifest-create.options";
import { createManifestOption } from "./common";

export const manifestCreateCommand = new Command("create");
manifestCreateCommand
  .description("Create a new Golem manifest.")
  .addOption(createManifestOption())
  .option("-w, --overwrite", "Overwrite existing manifest (if present).")
  .option("-d, --description <text>", "Description of the manifest.")
  .option("-v, --version <version>", "Version of the manifest.", "1.0.0")
  .option("-i, --image-hash <hash>", "Image hash to be used in the manifest (format 'hash-function:hash-base64'")
  .argument("<name>", "Name of the manifest.")
  .argument("<image>", "Image to be used in the manifest, identified by URL, image tag or image hash.")
  .action(async (name: string, image: string, options: ManifestCreateOptions) => {
    const action = await import("./manifest-create.action.js");
    await action.manifestCreateAction(name, image, options);
  });
