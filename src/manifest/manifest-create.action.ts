import { ManifestCreateOptions } from "./manifest-create.options";
import { ManifestDto, ManifestVersions } from "./dto";
import { writeFile } from "fs/promises";
import { checkFileOverwrite } from "../lib/file";
import fetch from "node-fetch";
import { DateTime } from "luxon";

const repoUrl = "https://registry.golem.network";

type ImageInfo = {
  url: string;
  hash?: string;
};

async function resolveTaskPackageUrl(tag: string): Promise<ImageInfo> {
  const url = `${repoUrl}/v1/image/info?&tag=${tag}`;

  const response = await fetch(url);
  if (response.status === 404) {
    // TODO: Print url on debug and stop using exceptions.
    throw new Error(`Error: Image ${tag} not found.`);
  } else if (response.status != 200) {
    throw Error(`Failed to fetch image information: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as { https: string; http: string; sha3: string };

  return {
    url: data.https,
    hash: `sha3:${data.sha3}`,
  };
}

async function getImageUrlFromTag(tag: string, providedHash?: string): Promise<ImageInfo> {
  if (providedHash) {
    return {
      url: `${repoUrl}/v1/image/download?tag=${tag}&https=true`,
      hash: providedHash,
    };
  }

  return await resolveTaskPackageUrl(tag);
}

async function getImageUrlFromUrl(url: string): Promise<ImageInfo> {
  const dlUrlPrefix = `${repoUrl}/v1/image/download?`;

  if (!url.startsWith(dlUrlPrefix)) {
    // Warning about missing hash will be displayed in manifestCreateAction.
    return {
      url,
      hash: undefined,
    };
  }

  const urlObject = new URL(url);
  const hash = urlObject.searchParams.get("hash");
  // const tag = urlObject.searchParams.get('tag');

  if (hash) {
    return getImageUrlFromHash(hash);
  }

  // Registry doesn't support download by tag?
  // if (tag) {
  //   return {
  //     ...await getImageUrlFromTag(tag),
  //     url: url,
  //   }
  // }

  // Possibly invalid URL or unknown way of downloading the image.
  // Warning about missing hash will be displayed in manifestCreateAction.
  return {
    url,
    hash: undefined,
  };
}

function getImageUrlFromHash(hash: string): ImageInfo {
  return {
    url: `${repoUrl}/v1/image/download?hash=${hash}&https=true`,
    hash: `sha3:${hash}`,
  };
}

async function getImage(imageSpec: string, providedHash?: string): Promise<ImageInfo> {
  const tagRegex = /^(.*?)\/(.*?):(.*)$/;
  const hashRegex = /^(\w+)$/;

  if (hashRegex.test(imageSpec)) {
    return getImageUrlFromHash(imageSpec);
  } else if (tagRegex.test(imageSpec)) {
    return await getImageUrlFromTag(imageSpec, providedHash);
    // Use package.
  } else if (providedHash) {
    // imageSpec is an URL and hash is provided.
    return {
      url: imageSpec,
      hash: providedHash,
    };
  } else {
    // Image spec is URL and hash is not provided.
    return getImageUrlFromUrl(imageSpec);
  }
}

export async function manifestCreateAction(name: string, image: string, options: ManifestCreateOptions): Promise<void> {
  const imageData = await getImage(image, options.imageHash);
  const now = DateTime.now();
  const expires = now.plus({ days: 90 }); // TODO: move that to options?

  const manifest: ManifestDto = {
    version: ManifestVersions.GAP_5,
    createdAt: now.toISO() as string,
    expiresAt: expires.toISO() as string,
    metadata: {
      name,
      description: options.description,
      version: options.version,
    },
    payload: [
      {
        platform: {
          os: "linux",
          arch: "x86_64",
        },
        hash: imageData.hash,
        urls: [imageData.url],
      },
    ],
  };

  // TODO: Add enquirer to ask for missing fields.

  manifest.metadata.name = name;
  manifest.metadata.description = options.description;
  manifest.metadata.version = options.version;

  await checkFileOverwrite("Manifest", options.manifest, options.overwrite);
  await writeFile(options.manifest, JSON.stringify(manifest, null, 2));

  if (!imageData.hash) {
    console.log("Warning: Image hash is not specified. You won't be able to start an activity before you fill it out.");
  }
}
