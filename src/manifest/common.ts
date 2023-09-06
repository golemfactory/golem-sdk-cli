import { Option } from "commander";

export function createManifestOption(): Option {
  return new Option("-f, --manifest <path>", "Path to manifest file.").default("./manifest.json");
}
