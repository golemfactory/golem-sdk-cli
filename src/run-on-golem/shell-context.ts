import { Command } from "commander";
import { shellProgram } from "./shell-program";
import { TaskExecutor } from "@golem-sdk/golem-js";
import { WorkContext } from "@golem-sdk/golem-js/dist/task";
import { ProgramContext } from "./context-interface";

export type VarsType = { [key: string]: string | undefined };

export class TaskAPIContext implements ProgramContext {
  exited = false;
  program: Command;
  workContext!: WorkContext;

  terminated = false;
  startDate = new Date();

  private workResolve: () => void = () => {};
  private workReject: (reason?: any) => void = () => {};

  private workerRunning = false;

  constructor(
    public executor: TaskExecutor,
    public vars: VarsType,
  ) {
    this.program = shellProgram(this);
  }

  magic(): Promise<void> {
    // NOTE: This magic is needed because there is no simple (or any) way to create w work context without TaskExecutor.
    return new Promise((resolve, reject) => {
      this.executor
        .run(
          (workContext) =>
            new Promise((wResolve, wReject) => {
              this.workContext = workContext;
              this.workResolve = wResolve as () => {};
              this.workReject = wReject;
              this.workerRunning = true;
              this.startDate = new Date();
              resolve();
            }),
          {
            maxRetries: -1, // FIXME: Let's fix that already in the SDK!!!
          },
        )
        .then(() => {
          this.workerRunning = false;
        })
        .catch((e) => {
          this.workerRunning = false;
          reject(e);
        });
    });
  }

  async terminate() {
    this.exited = true;
    if (this.workerRunning) {
      this.workResolve();
    }

    await this.executor.end();
    this.terminated = true;
  }
}
