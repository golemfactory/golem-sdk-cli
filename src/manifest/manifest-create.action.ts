import { ManifestCreateOptions } from "./manifest-create.options";
import { ManifestDto, ManifestVersions } from "./dto";
import { readFile, writeFile } from "fs/promises";
import { checkFileOverwrite } from "../lib/file";
import fetch from "node-fetch";
import { DateTime } from "luxon";
import { findAsync } from "new-find-package-json";

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
  const hashRegex = /^[a-z0-9]{56}$/;
  const maybeHash = /^[a-z0-9]+$/;

  if (maybeHash.test(imageSpec)) {
    if (!hashRegex.test(imageSpec)) {
      console.error(
        `Error: Image name ${imageSpec} looks like a hash, but has invalid length. Please make sure it is a valid SHA3 hash.`,
      );
      process.exit(1);
    }

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

async function findPackageJson(possiblePath?: string): Promise<string | undefined> {
  if (possiblePath) {
    return possiblePath;
  }

  // Find first package.json file.
  for await (const path of findAsync(process.cwd(), "package.json")) {
    return path;
  }
}

async function fillOptionsWithPackageJson(options: ManifestCreateOptions): Promise<ManifestCreateOptions> {
  if ("manifestVersion" in options && "name" in options && "description" in options) {
    // All fields from package.json are provided.
    return options;
  }

  const path = await findPackageJson(options.packageJson);
  if (!path) {
    console.error(
      'Error: Cannot find package.json. Use "--package-json" option to specify its path or make sure --name, --description and --manifest-version are set.',
    );
    process.exit(1);
  }

  // Read package.json.
  let packageData: string;
  try {
    packageData = await readFile(path, "utf-8");
  } catch (e) {
    console.error(`Error: Cannot read ${path}: ${e}`);
    process.exit(1);
  }

  // Parse package.json
  let packageJson: { version: string; name: string; description?: string };
  try {
    packageJson = JSON.parse(packageData);
  } catch (e) {
    console.error(`Error: Cannot parse ${path}: ${e}`);
    process.exit(1);
  }

  if (!("manifestVersion" in options)) {
    options.manifestVersion = packageJson.version;
  }

  if (!("name" in options)) {
    options.name = packageJson.name;
  }

  if (!("description" in options)) {
    options.description = packageJson.description;
  }

  return options;
}

function validateImageInfo(imageInfo: ImageInfo) {
  const hashWithFunctionRegEx = /^sha3:[a-z0-9]{56}$/;

  try {
    new URL(imageInfo.url);
  } catch (e) {
    console.error(`Error: Failed to parse xx image URL ${imageInfo.url}: ${e}`);
    process.exit(1);
  }

  if (!hashWithFunctionRegEx.test(imageInfo.hash ?? "")) {
    console.error(`Error: Invalid image hash ${imageInfo.hash}.`);
    process.exit(1);
  }
}

export async function manifestCreateAction(image: string, options: ManifestCreateOptions): Promise<void> {
  const imageData = await getImage(image, options.imageHash);
  validateImageInfo(imageData);
  const now = DateTime.now();
  const expires = now.plus({ days: 90 }); // TODO: move that to options?

  options = await fillOptionsWithPackageJson(options);

  const manifest: ManifestDto = {
    version: ManifestVersions.GAP_5,
    createdAt: now.toISO() as string,
    expiresAt: expires.toISO() as string,
    metadata: {
      name: options.name!,
      description: options.description,
      version: options.manifestVersion!,
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
  await checkFileOverwrite("Manifest", options.manifest, options.overwrite);
  await writeFile(options.manifest, JSON.stringify(manifest, null, 2));

  if (!imageData.hash) {
    console.log("Warning: Image hash is not specified. You won't be able to start an activity before you fill it out.");
  }

  console.log("Created manifest in %s file", options.manifest);
}
