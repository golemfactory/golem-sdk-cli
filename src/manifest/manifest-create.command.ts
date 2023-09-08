import { Command } from "commander";
import { ManifestCreateOptions } from "./manifest-create.options";
import { createManifestOption } from "./common";

export const manifestCreateCommand = new Command("create");
manifestCreateCommand
  .description("Create a new Golem manifest.")
  .addOption(createManifestOption())
  .option("-w, --overwrite", "Overwrite existing manifest (if present).")
  .option("-n, --name <name>", "Name of the manifest/project.")
  .option("-d, --description <text>", "Description of the manifest.")
  .option("-v, --manifest-version <version>", "Version of the manifest.")
  .option("-i, --image-hash <hash>", "Image hash to be used in the manifest (format 'hash-function:hash-base64').")
  .option("-p, --package-json <file>", "Package.json file to be used as information source.")
  .argument("<image>", "Image to be used in the manifest, identified by URL, image tag or image hash.")
  .addHelpText(
    "after",
    "\npackage.json can be used to automatically fill manifest name, description and version." +
      "\nIf package.json path is not provided, it will be looked for in current directory and all parent directories.",
  )
  .action(async (image: string, options: ManifestCreateOptions) => {
    const action = await import("./manifest-create.action.js");
    await action.default.manifestCreateAction(image, options);
  });
