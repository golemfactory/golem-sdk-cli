import { readManifest } from "./manifest-utils";
import { ManifestVerifyOptions } from "./manifest-verify.options";

import { X509Certificate } from "node:crypto";
import { readFile } from "fs/promises";
import { createVerify } from "crypto";
import { assertFileExists } from "../lib/file";

function getLastCertificate(certificateChain: string, certFile: string): string {
  const i = certificateChain.lastIndexOf("-----BEGIN CERTIFICATE-----");

  if (i === -1) {
    console.error(`Error: Could not locate the certificate to use for validation in ${certFile}.`);
    process.exit(1);
  }

  return certificateChain.substring(i);
}

export async function manifestVerifyAction(options: ManifestVerifyOptions) {
  await assertFileExists("Manifest file", options.manifest, "Check --manifest option.");
  await assertFileExists("Certificate file", options.certificateFile, "Check --certificate-file option.");
  await assertFileExists("Signature file", options.signatureFile, "Check --signature-file option.");

  // Validate the manifest. We don't need parsed data, so output is ignored.
  await readManifest(options.manifest);

  // Read manifest buffer.
  const manifestBuffer = await readFile(options.manifest);
  const manifestBase64 = manifestBuffer.toString("base64");
  const certFile = await readFile(options.certificateFile, "ascii");
  const signature = Buffer.from(await readFile(options.signatureFile, "ascii"), "base64");

  const certLast = getLastCertificate(certFile, options.certificateFile);
  const cert = new X509Certificate(Buffer.from(certLast));

  const verify = createVerify("RSA-SHA256");
  verify.update(manifestBase64);

  if (!verify.verify(cert.publicKey, signature)) {
    console.error("Error: Manifest doesn't match signature.");
    process.exit(1);
  }

  // TODO: Check if the certificate and manifest are not expired.
  console.log("Manifest matches signature.");
}
