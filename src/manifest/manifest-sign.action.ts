import { ManifestSignOptions } from "./manifest-sign.options";
import { readManifest } from "./manifest-utils";
import { readFile, writeFile } from "fs/promises";
import { createSign } from "crypto";

export async function manifestSignAction(options: ManifestSignOptions): Promise<void> {
  // Read and validate the manifest.
  await readManifest(options.manifest);

  // Read manifest buffer.
  const manifestBuffer = await readFile(options.manifest);
  const manifestBase64 = manifestBuffer.toString("base64");

  const keyFile = await readFile(options.keyFile);

  // Parse key file to KeyObject?
  const sign = createSign("RSA-SHA256");
  sign.update(manifestBase64);
  const signature = sign.sign({
    key: keyFile,
    // FIXME: Allow secure passphrase input and detect if a passphrase is needed.
    passphrase: options.passphrase,
  });

  // write signature to options.signatureFile.
  await writeFile(options.signatureFile, Buffer.from(signature).toString("base64"), "ascii");
}
