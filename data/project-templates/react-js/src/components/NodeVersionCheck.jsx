import { useExecutor } from "@golem-sdk/react";
import { NodeVersionCheckTask } from "./NodeVersionCheckTask";

export function NodeVersionCheck() {
  const { executor, initialize, isInitialized, isInitializing, terminate, error } = useExecutor({
    demand: {
      workload: {
        imageTag: "golem/node:20-alpine",
      },
    },
    // Where you want to spend
    payment: {
      network: "holesky",
    },
    market: {
      // Let's rent the provider for no more than 15 minutes
      rentHours: 15 / 60,
      // Let's agree to pay at most 0.5 GLM per hour
      pricing: {
        model: "burn-rate",
        avgGlmPerHour: 0.5,
      },
    },
    // Control the execution of tasks
    task: {
      taskTimeout: 5 * 60 * 1000,
      maxTaskRetries: 0,
    },
    // Look at the browser console to see what's happening under the hood
    enableLogging: true,
  });

  return (
    <div className="node-version-check-wrapper">
      {error && <div className="text-error">Error: {error.toString()}</div>}
      {isInitialized && executor && <NodeVersionCheckTask executor={executor} />}
      {isInitializing && <div>Executor is initializing</div>}
      {!isInitialized && (
        <button onClick={() => initialize()} className="bg-progress">
          Initialize executor
        </button>
      )}
      {isInitialized && (
        <button onClick={terminate} className="bg-success">
          Finish and pay for work
        </button>
      )}
    </div>
  );
}
