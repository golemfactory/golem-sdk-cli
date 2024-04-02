import { WorkContext } from "@golem-sdk/golem-js";

export interface ProgramContext {
  exited: boolean;
  workContext: WorkContext;
  startDate: Date;
  vars: { [key: string]: string | undefined };
}
