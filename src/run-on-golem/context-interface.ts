import { WorkContext } from "@golem-sdk/golem-js/dist/task";
import { Command } from "commander";

export interface ProgramContext {
  exited: boolean;
  workContext: WorkContext;
  program: Command;
  startDate: Date;
  vars: { [key: string]: string | undefined };
}
