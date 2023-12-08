import { TaskExecutor, useTask, Worker } from "@golem-sdk/react";

export function NodeVersionCheckTask({ executor }: { executor: TaskExecutor }) {
  const { isRunning, result, run, error } = useTask<string>(executor);

  const getNodeVersionTask: Worker<unknown, string> = async (ctx) => {
    return (await ctx.run("node -v")).stdout?.toString() ?? "No version information";
  };

  return (
    <div className="node-version-check-task">
      <button onClick={() => run(getNodeVersionTask)} disabled={isRunning} className="bg-progress">
        Check NodeJS version on provider
      </button>
      <div className="node-version-check-task-status">
        {isRunning && <div className="text-progress">Task is running...</div>}
        {error && <div className="text-error">Task failed: {error.toString()}</div>}
        {result && <div className="text-success">Task result: {result}</div>}
      </div>
    </div>
  );
}
