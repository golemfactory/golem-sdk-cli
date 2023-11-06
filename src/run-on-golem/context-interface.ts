import { WorkContext } from "@golem-sdk/golem-js/dist/task";

export interface ProgramContext {
  exited: boolean;
  workContext: WorkContext;
  startDate: Date;
  vars: { [key: string]: string | undefined };
}
