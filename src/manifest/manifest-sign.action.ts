import { ManifestSignOptions } from "./manifest-sign.options";
import { readManifest } from "./manifest-utils";
import { readFile } from "fs/promises";

export async function manifestSignAction(options: ManifestSignOptions): Promise<void> {
  // Read and validate the manifest.
  await readManifest(options.manifest);

  // Read manifest buffer.
  const manifestBuffer = await readFile(options.manifest);
  const manifestBase64 = manifestBuffer.toString('base64');

  const keyFile = await readFile(options.keyFile);

  // Parse key file to KeyObject?

  // sign with Sign?

  // write signature to options.signatureFile.
  // It's ok to use base64 here as the signature is a binary file.
  // `checkFileOverwrite('signature', options.signatureFile, options.overwrite);` can be used to make sure we don't overwrite
  // existing signature file. Not sure if this is needed (UX/DX question).

}

