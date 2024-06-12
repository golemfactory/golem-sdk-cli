export type ProcessEnvVars = { [key: string]: string | undefined };

export type ActivityMetadata = {
  activityStart: Date;
  terminating: boolean;
};

export type ProcessContext = {
  env: ProcessEnvVars;
  metadata: ActivityMetadata;
};
