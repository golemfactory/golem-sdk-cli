import { Command } from "commander";
import { ManifestCreateOptions } from "./manifest-create.options";

export const manifestCreateCommand = new Command("create");
manifestCreateCommand
  .description('Create a new Golem manifest.')
  .option('-f, --manifest <path>', 'Path to manifest file.', './manifest.json')
  .option('-w, --overwrite', 'Overwrite existing manifest (if present).')
  .option('-d, --description <text>', 'Description of the manifest.')
  .option('-v, --version <version>', 'Version of the manifest.', '1.0.0')
  .option('-i, --image-hash <hash>', 'Image hash to be used in the manifest.')
  .argument('<name>', 'Name of the manifest.')
  .argument('<image>', 'Image to be used in the manifest, identified by URL.')
  .action(async (name: string, image: string, options: ManifestCreateOptions) => {
    const action = await import('./manifest-create.action');
    await action.manifestCreateAction(name, image, options);
  });
