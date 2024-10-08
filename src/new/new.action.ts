import { newDefaultOptions, NewOptions, newProjectNameError, newProjectNameRegEx } from "./new.options";

import { prompt } from "enquirer";
import { join } from "path";
import { existsSync } from "fs";
import { cp, readFile, writeFile } from "fs/promises";
import { getPackageManager } from "../lib/pkg";
import { spawnSync } from "child_process";

async function getName(providedName: string): Promise<string> {
  if (!providedName) {
    const result = (await prompt({
      type: "input",
      name: "name",
      message: "Project name",
      validate(value: string) {
        return !newProjectNameRegEx.test(value) ? newProjectNameError : true;
      },
    })) as { name: string };

    providedName = result.name;
  } else {
    if (!newProjectNameRegEx.test(providedName)) {
      console.error(`Error: Project name ${providedName} is invalid: ${newProjectNameError}`);
      process.exit(1);
    }
  }

  return providedName;
}

async function getVersion(providedVersion?: string, useDefault = false): Promise<string> {
  if (typeof providedVersion === "string") {
    return providedVersion;
  }

  if (useDefault) {
    return newDefaultOptions.appVersion;
  }

  const result = (await prompt({
    type: "input",
    name: "version",
    message: "Project version",
    initial: newDefaultOptions.appVersion,
  })) as { version: string };

  return result.version;
}

async function getTemplate(providedTemplate?: string): Promise<string> {
  if (typeof providedTemplate !== "string") {
    const result = (await prompt({
      type: "select",
      name: "template",
      message: "Select a project template",
      choices: [
        { name: "ts-node", hint: "TypeScript CLI application (CommonJS)" },
        { name: "ts-node-esm", hint: "TypeScript CLI application (ESM)" },
        { name: "js-node", hint: "Plain Javascript CLI application (CommonJS)" },
        { name: "js-node-esm", hint: "Plain Javascript CLI application (ESM)" },
        {
          name: "react-js",
          hint: "React web application (with Vite and plain Javascript)",
        },
        { name: "react-ts", hint: "React web application (with Vite and Typescript)" },
      ],
    })) as { template: string };

    providedTemplate = result.template;
  }

  if (!newProjectNameRegEx.test(providedTemplate)) {
    console.error(`Error: Template name ${providedTemplate} is invalid.`);
    process.exit(1);
  }

  return providedTemplate;
}

async function getDescription(providedDescription?: string, useDefault = false): Promise<string> {
  if (typeof providedDescription === "string") {
    return providedDescription;
  }

  if (useDefault) {
    return newDefaultOptions.description;
  }

  const result = (await prompt({
    type: "input",
    name: "description",
    message: "Project description",
    initial: newDefaultOptions.description,
  })) as { description: string };

  return result.description;
}

type PackageJsonBasic = {
  name: string;
  description: string;
  version: string;
  author?: string;
};

async function updatePackageJson(projectPath: string, data: PackageJsonBasic): Promise<void> {
  const packageJson = join(projectPath, "package.json");
  let input: string;
  let json: PackageJsonBasic;

  try {
    input = await readFile(packageJson, "utf8");
  } catch (e) {
    console.error(`Error: Failed to read ${packageJson}: ${e}`);
    process.exit(1);
  }

  try {
    json = JSON.parse(input);
  } catch (e) {
    console.error(`Error: Failed to parse ${packageJson}: ${e}`);
    process.exit(1);
  }

  json.name = data.name;
  json.description = data.description;
  json.version = data.version;
  if (data.author) {
    json.author = data.author;
  }

  try {
    await writeFile(packageJson, JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(`Error: Failed to write ${packageJson}: ${e}`);
    process.exit(1);
  }
}

function installDependencies(options: NewOptions, projectPath: string) {
  if (options.skipInstall) {
    console.log("Skipping dependency installation as requested.");
    return;
  }

  console.log("Installing dependencies...");

  const pkg = getPackageManager();
  const args = pkg.name === "yarn" ? [] : ["install"];

  // `shell: true` is required by Windows to run npm.
  const result = spawnSync(pkg.name, args, { cwd: projectPath, stdio: "inherit", shell: true });

  if (result.error) {
    console.error(`Error: There was a problem installing dependencies: ${result.error.message}`);
    console.error("Note: You may need to install dependencies manually.");
  } else if (result.status !== 0) {
    console.error(`Error: Process existed with status code ${result.status}.`);
    console.error("Note: You may need to install dependencies manually.");
  }
}

export async function newAction(providedName: string, options: NewOptions) {
  const name = await getName(providedName);
  const projectPath = options.path ?? join(process.cwd(), name);
  if (existsSync(projectPath)) {
    console.error(`Error: ${projectPath} already exists.`);
    process.exit(1);
  }

  const template = await getTemplate(options.template);
  const templatePath = join(__dirname, "../../data/project-templates", template);
  if (!existsSync(templatePath)) {
    console.error(`Error: Template ${template} not found.`);
    process.exit(1);
  }

  const description = await getDescription(options.description, options.yes);
  const version = await getVersion(options.appVersion, options.yes);
  const author = options.author;

  console.log(`Creating a new Golem app in ${projectPath}.`);

  try {
    await cp(templatePath, projectPath, { recursive: true });
  } catch (e) {
    console.error(`Error: Failed to copy template files: ${e}`);
    process.exit(1);
  }

  // Update package.json
  await updatePackageJson(projectPath, {
    name,
    description,
    version,
    author,
  });

  installDependencies(options, projectPath);

  console.log(`Project created successfully in ${projectPath}.`);

  // react templates don't read the app key from env
  const isReactProject = template.startsWith("react");
  if (!process.env.YAGNA_APPKEY && !isReactProject) {
    console.log(
      "NOTE: You do not seem to have YAGNA_APPKEY environment variable defined. You will need to define it or provide a .env file with it to run your new application.",
    );
  }

  // TODO: Show some next steps, or pull it from template directory.
}
