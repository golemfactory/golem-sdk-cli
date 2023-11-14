export interface RunOnGolemOptions {
  manifest: string; // At worse, it will contain a default value
  image?: string;
  execute?: string;
  env?: boolean; // commander.js skips `no` in options names.
  timeout: string;
  interactive?: boolean;
}
