export interface NewOptions {
  author?: string;
  description?: string;
  path?: string;
  template?: string;
  appVersion?: string;
  skipInstall?: boolean;
  yes: boolean;
}

export const newProjectNameRegEx = /^[a-z0-9-_]+$/;
export const newProjectNameError =
  "Project name may only contain lower case letters, numbers, hyphens and underscores.";

export const newDefaultOptions = {
  description: "An unique and awesome application that runs on Golem Network",
  appVersion: "1.0.0",
};
