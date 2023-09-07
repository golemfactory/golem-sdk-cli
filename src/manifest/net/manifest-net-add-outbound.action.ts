import { ManifestNetAddOutboundOptions } from "./manifest-net-add-outbound.options";
import { readManifest } from "../manifest-utils";
import { ManifestCompManifestDto } from "../dto";
import { merge } from "lodash";
import { writeFile } from "fs/promises";
import { combineUniqueArrays } from "../../lib/data";

/**
 * Parse provided urls and report error if any of them are invalid.
 * @param urls
 */
function parseUrls(urls: string[]): URL[] {
  const parsed: URL[] = [];
  const errors: string[] = [];

  urls.forEach((url) => {
    try {
      parsed.push(new URL(url));
    } catch (e) {
      errors.push(url);
    }
  });

  if (errors.length) {
    console.error("Invalid URLs:");
    console.error(errors.map((url) => `- ${url}`).join("\n"));
    throw new Error("Invalid URL(s) provided.");
  }

  return parsed;
}

export async function manifestNetAddOutboundAction(
  urls: string[],
  options: ManifestNetAddOutboundOptions,
): Promise<void> {
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
