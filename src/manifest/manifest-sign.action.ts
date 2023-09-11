import { ManifestSignOptions } from "./manifest-sign.options";
import { readManifest } from "./manifest-utils";
import { readFile, writeFile } from "fs/promises";
import { createSign } from "crypto";
import { assertFileExists } from "../lib/file";

export async function manifestSignAction(options: ManifestSignOptions): Promise<void> {
  // Read and validate the manifest.
  await readManifest(options.manifest);
  await assertFileExists("Private key file", options.keyFile, "Check --key-file option.");

  // Read manifest buffer.
  const manifestBuffer = await readFile(options.manifest);
  const manifestBase64 = manifestBuffer.toString("base64");

  const keyFile = await readFile(options.keyFile);
  const passphraseRequired = keyFile.toString("ascii").includes("BEGIN ENCRYPTED PRIVATE KEY");

  if (passphraseRequired && !options.passphrase) {
    console.error("Error: Private key file is encrypted and no passphrase was provided. Use --passphrase option.");
    process.exit(1);
  } else if (!passphraseRequired && options.passphrase) {
    console.error("Error: Private key file is not encrypted and passphrase was provided. Remove --passphrase option.");
    process.exit(1);
  }

  // Sign the manifest.
  let signature: Buffer;
  const sign = createSign("RSA-SHA256");
  sign.update(manifestBase64);

  try {
    signature = sign.sign({
      key: keyFile,
      passphrase: options.passphrase,
    });
  } catch (e) {
    if (e instanceof Error && "code" in e) {
      if (e.code === "ERR_OSSL_BAD_DECRYPT") {
        console.error(`Error: Wrong passphrase provided for the private key ${options.keyFile}.`);
        process.exit(1);
      } else if (e.code === "ERR_OSSL_UNSUPPORTED") {
        console.error(`Error: Private key file ${options.keyFile} is not supported.`);
        process.exit(1);
      }
    }

    throw e;
  }

  // write signature to options.signatureFile.
  await writeFile(options.signatureFile, Buffer.from(signature).toString("base64"), "ascii");

  console.log("Signed the manifest file and stored the signature in %s", options.signatureFile);
}
