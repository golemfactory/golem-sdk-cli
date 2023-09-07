import { ManifestDto } from "./dto";
import { Stats } from "fs";
import { readFile, stat } from "fs/promises";
import schema from "./computation-payload-manifest.schema.json";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export async function readManifest(filename: string): Promise<ManifestDto> {
  let fileStats: Stats;

  try {
    fileStats = await stat(filename);
  } catch (e) {
    throw new Error(`Error: Manifest file ${filename} can't be read: ${e}`);
  }

  if (!fileStats.isFile()) {
    throw new Error(`Error: Manifest file ${filename} is not a file.`);
  }

  let data: Buffer;
  try {
    data = await readFile(filename);
  } catch (e) {
    throw new Error(`Error: Failed to read manifest ${filename}: ${e}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(data.toString());
  } catch (e) {
    throw new Error(`Error: Failed to parse manifest ${filename}: ${e}`);
  }

  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile<ManifestDto>(schema);

  if (validate(json)) {
    return json;
  }

  console.error(`Manifest ${filename} is invalid:`);
  console.error(
    ajv
      .errorsText(validate.errors, { separator: "\n" })
      .split(/\n/g)
      .map((line) => `- ${line}`)
      .join("\n"),
  );
  throw new Error(`Error: Manifest ${filename} is not valid.`);
}
