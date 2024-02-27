import { TaskExecutor, WorkContext } from "@golem-sdk/task-executor";
import { ProgramContext } from "./context-interface";

export type VarsType = { [key: string]: string | undefined };

export class TaskAPIContext implements ProgramContext {
  exited = false;
  workContext!: WorkContext;

  terminated = false;
  startDate = new Date();

  private workResolve: () => void = () => {};

  private workerRunning = false;

  constructor(
    public executor: TaskExecutor,
    public vars: VarsType,
  ) {}

  magic(): Promise<void> {
    // NOTE: This magic is needed because there is no simple (or any) way to create w work context without TaskExecutor.
    return new Promise((resolve, reject) => {
      this.executor
        .run(
          (workContext) =>
            new Promise((wResolve) => {
              this.workContext = workContext;
              this.workResolve = wResolve as () => void;
              this.workerRunning = true;
              this.startDate = new Date();
              resolve();
            }),
          {
            maxRetries: 0,
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

    await this.executor.shutdown();
    this.terminated = true;
  }
}
