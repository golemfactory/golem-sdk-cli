import { readManifest } from "./manifest-utils";
import { ManifestVerifyOptions } from "./manifest-verify.options";

import { X509Certificate } from "node:crypto";
import { readFile } from "fs/promises";
import { createVerify } from "crypto";
import { assertFileExists } from "../lib/file";

export async function manifestVerifyAction(options: ManifestVerifyOptions) {
  // Read and validate the manifest.
  await readManifest(options.manifest);

  await assertFileExists("Certificate file", options.certificateFile, "Check --certificate-file option.");
  await assertFileExists("Signature file", options.signatureFile, "Check --signature-file option.");

  // Read manifest buffer.
  const manifestBuffer = await readFile(options.manifest);
  const manifestBase64 = manifestBuffer.toString("base64");
  const certFile = Buffer.from(await readFile(options.certificateFile, "ascii"), "base64");
  const signature = Buffer.from(await readFile(options.signatureFile, "ascii"), "base64");
  // const signature = await readFile(options.signature, 'ascii');

  // FIXME: Find better way to get the second (or last?) certificate.
  const certInput = certFile.toString();
  const i = certInput.lastIndexOf("-----BEGIN CERTIFICATE-----");

  if (i === -1) {
    console.error(
      "Could not locate the certificate to use for validation. Certificate file contents:",
      certFile.toString(),
    );
    process.exit(1);
  }

  const certSecond = certInput.substring(i);

  // const cert = new X509Certificate(certFile);
  const cert = new X509Certificate(Buffer.from(certSecond));

  const verify = createVerify("RSA-SHA256");
  verify.update(manifestBase64);

  if (!verify.verify(cert.publicKey, signature)) {
    console.error("Manifest doesn't match signature.");
    process.exit(1);
  }

  // TODO: Check if the certificate is not expired.
  console.log("Manifest matches signature.");
}
