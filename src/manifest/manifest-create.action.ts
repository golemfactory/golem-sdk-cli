import { ManifestCreateOptions } from "./manifest-create.options";
import { ManifestDto, ManifestVersions } from "./dto";
import { writeFile } from "fs/promises";
import { checkFileOverwrite } from "../lib/file";

export async function manifestCreateAction(name: string, image: string, options: ManifestCreateOptions): Promise<void> {
  const now = new Date();
  const manifest: ManifestDto = {
    version: ManifestVersions.GAP_5,
    createdAt: now.toUTCString(),
    expiresAt: new Date(now.getTime() + 90*24*60*1000).toUTCString(),
    metadata: {
      name,
      description: options.description,
      version: options.version,
    },
    payload: [
      {
        platform: {
          os: "linux",
          arch: "x86_64"
        },
        hash: options.imageHash,
        urls: [ image ]
      }
    ],
    compManifest: {

    }
  }

  // TODO: Add enquirer to ask for missing fields.

  manifest.metadata.name = name;
  manifest.metadata.description = options.description;
  manifest.metadata.version = options.version;

  await checkFileOverwrite('Manifest', options.manifest, options.overwrite);
  await writeFile(options.manifest, JSON.stringify(manifest, null, 2));
}