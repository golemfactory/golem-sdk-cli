export interface ManifestCreateOptions {
  manifestVersion?: string;
  overwrite: boolean;
  name?: string;
  description?: string;
  manifest: string;
  imageHash?: string;
  packageJson?: string;
}
