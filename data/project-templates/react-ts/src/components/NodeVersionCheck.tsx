import { useExecutor } from "@golem-sdk/react";
import { ProposalFilterFactory } from "@golem-sdk/golem-js";
import { NodeVersionCheckTask } from "./NodeVersionCheckTask";

export function NodeVersionCheck() {
  const { executor, initialize, isInitialized, isInitializing, terminate, error } = useExecutor({
    // What do you want to run
    package: "golem/node:20-alpine",

    // How much you wish to spend
    budget: 0.5,

    // How do you want to select market proposals
    proposalFilter: ProposalFilterFactory.limitPriceFilter({
      start: 0.1,
      cpuPerSec: 0.1 / 3600,
      envPerSec: 0.1 / 3600,
    }),

    // Where you want to spend
    payment: {
      network: "polygon",
    },

    // Control the execution of tasks
    maxTaskRetries: 0,
    taskTimeout: 5 * 60 * 1000,
  });

  return (
    <div className="node-version-check-wrapper">
      {error && <div className="text-error">Error: {error.toString()}</div>}
      {isInitialized && executor && <NodeVersionCheckTask executor={executor} />}
      {isInitializing && <div>Executor is initializing</div>}
      {!isInitialized && (
        <button onClick={initialize} className="bg-progress">
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
