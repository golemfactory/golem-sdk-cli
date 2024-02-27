import * as dotenv from "dotenv";
import { ProposalFilterFactory, TaskExecutor } from "@golem-sdk/task-executor";
import { pinoLogger } from "@golem-sdk/golem-js";

dotenv.config();

(async function main() {
  const executor = await TaskExecutor.create({
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

    // Useful for debugging
    logger: pinoLogger({
      level: "info",
    }),
    taskTimeout: 5 * 60 * 1000,
  });

  try {
    // Your code goes here
    const result = await executor.run((ctx) => ctx.run("node -v"));
    console.log("Version of NodeJS on Provider:", (result!.stdout as string).trim());
  } catch (err) {
    console.error("Running the task on Golem failed due to", err);
  } finally {
    await executor.shutdown();
  }
})();
