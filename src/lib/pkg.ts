export interface PackageManager {
  name: string;
  version?: string;
}

/**
 * When CLI is run from a package manager, npm_config_user_agent should be set.
 *
 * Use this information to determine which package manager is being used.
 *
 * @param userAgent Optional user agent.
 */
export function getPackageManager(userAgent?: string) {
  const result: PackageManager = {
    name: "npm",
  };

  const ua = userAgent ?? process.env["npm_config_user_agent"];
  if (!ua) {
    return result;
  }

  const split = ua.split(" ")[0];
  if (!split) {
    return result;
  }

  const [name, version] = split.split("/");
  if (name) {
    result.name = name;
  }
  if (version) {
    result.version = version;
  }

  return result;
}
