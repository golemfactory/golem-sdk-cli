import { ManifestNetAddOutboundOptions } from "./manifest-net-add-outbound.options";
import { readManifest } from "../manifest-utils";
import { ManifestCompManifestDto } from "../dto";
import { merge } from "lodash";
import { writeFile } from "fs/promises";
import { combineUniqueArrays } from "../../lib/data";
import { assertFileExists } from "../../lib/file";

/**
 * Parse provided urls and report error if any of them are invalid.
 * @param urls
 */
function parseUrls(urls: string[]): URL[] {
  const parsed: URL[] = [];
  const errors: string[] = [];

  urls.forEach((url) => {
    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.protocol) {
        errors.push(url);
        return;
      }

      // TODO: Filter only supported protocols. Problem: we don't know yet what is supported.

      parsed.push(parsedUrl);
    } catch (e) {
      errors.push(url);
    }
  });

  if (errors.length) {
    console.error("Error: Invalid URLs provided:");
    console.error(errors.map((url) => `- ${url}`).join("\n"));
    process.exit(1);
  }

  return parsed;
}

export async function manifestNetAddOutboundAction(
  urls: string[],
  options: ManifestNetAddOutboundOptions,
): Promise<void> {
  await assertFileExists("Manifest file", options.manifest, "Check --manifest option.");

  const parsedUrls = parseUrls(urls);
  const protocols = parsedUrls.map((url) => url.protocol.replace(/:$/, ""));

  let manifest = await readManifest(options.manifest);
  const out = manifest?.compManifest?.net?.inet?.out;

  const comp: ManifestCompManifestDto = {
    version: "0.1.0",
    net: {
      inet: {
        out: {
          urls: combineUniqueArrays(out?.urls ?? [], urls),
          protocols: combineUniqueArrays(out?.protocols ?? [], protocols),
        },
      },
    },
  };

  manifest = merge(manifest, { compManifest: comp });
  await writeFile(options.manifest, JSON.stringify(manifest, null, 2));
}
