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

export async function checkFileExists(name: string, path: string, extraHelp?: string): Promise<boolean> {
  extraHelp = extraHelp ? ` ${extraHelp}` : "";
  try {
    const stats = await stat(path);

    if (!stats.isFile()) {
      console.error(`Error: "${path}" is not a file.${extraHelp}`);
      return false;
    }
  } catch (e) {
    if (e && typeof e === "object" && "code" in e) {
      if (e.code === "ENOENT") {
        console.error(`Error: ${name} "${path}" not found.${extraHelp}`);
        return false;
      } else if (e.code === "EACCES") {
        console.error(`Error: ${name} "${path}" access error: permission denied.`);
        return false;
      }
    }

    const message = e && typeof e === "object" && "message" in e ? e["message"] : e;
    console.error(`Error: ${name} "${path}" access error: ${message}`);
  }
  return true;
}

export async function checkDirExists(name: string, path: string, extraHelp?: string): Promise<boolean> {
  extraHelp = extraHelp ? ` ${extraHelp}` : "";
  try {
    const stats = await stat(path);

    if (!stats.isDirectory()) {
      console.error(`Error: "${path}" is not a directory.${extraHelp}`);
      return false;
    }
  } catch (e) {
    if (e && typeof e === "object" && "code" in e) {
      if (e.code === "ENOENT") {
        console.error(`Error: ${name} "${path}" not found.${extraHelp}`);
        return false;
      } else if (e.code === "EACCES") {
        console.error(`Error: ${name} "${path}" access error: permission denied.`);
        return false;
      }
    }

    const message = e && typeof e === "object" && "message" in e ? e["message"] : e;
    console.error(`Error: ${name} "${path}" access error: ${message}`);
  }
  return true;
}

export async function assertFileExists(name: string, path: string, extraHelp?: string): Promise<void> {
  if (!(await checkFileExists(name, path, extraHelp))) {
    process.exit(1);
  }
}

export async function assertDirExists(name: string, path: string, extraHelp?: string): Promise<void> {
  if (!(await checkDirExists(name, path, extraHelp))) {
    process.exit(1);
  }
}
