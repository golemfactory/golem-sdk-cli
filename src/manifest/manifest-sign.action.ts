import { ManifestSignOptions } from "./manifest-sign.options";
import { readManifest } from "./manifest-utils";
import { readFile, writeFile } from "fs/promises";
import { createSign } from "crypto";
import { assertFileExists } from "../lib/file";

export async function manifestSignAction(options: ManifestSignOptions): Promise<void> {
  await assertFileExists("Manifest file", options.manifest, "Check --manifest option.");
  await assertFileExists("Private key file", options.keyFile, "Check --key-file option.");

  // Validate the manifest. We don't need parsed data, so output is ignored.
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

  console.log("Signed the manifest file and stored the signature in %s", options.signatureFile);
}
