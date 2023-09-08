import { stat } from "fs/promises";

export async function checkFileOverwrite(
  type: string,
  path: string,
  overwrite: boolean,
  option = "--overwrite",
): Promise<void> {
  // TODO: Check if file is a normal file.
  try {
    const s = await stat(path);
    if (s) {
      if (!overwrite) {
        console.error(
          `Error: ${type} file already exists at ${path}. Use ${option} option if you want to overwrite it.`,
        );
        process.exit(1);
      }
    }
  } catch (e) {
    // File does not exist, that's fine.
  }
}

export async function assertFileExists(name: string, path: string): Promise<void> {
  try {
    await stat(path);
  } catch (e) {
    // File does not exist, that's fine.
    console.error(`Error: ${name} "${path}" not found.`);
    process.exit(1);
  }
}
