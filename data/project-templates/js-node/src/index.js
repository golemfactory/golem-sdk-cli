const dotenv = require("dotenv");
const { LogLevel, TaskExecutor, ProposalFilters } = require("@golem-sdk/golem-js");

dotenv.config();

(async function main() {
  const executor = await TaskExecutor.create({
    // What do you want to run
    package: "golem/node:20-alpine",

    // How much you wish to spend
    budget: 0.5,

    // How do you want to select market proposals
    proposalFilter: ProposalFilters.limitPriceFilter({
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
    logLevel: LogLevel.Info,
    taskTimeout: 5 * 60 * 1000,
  });

  try {
    // Your code goes here
    const result = await executor.run((ctx) => ctx.run("node -v"));
    console.log("Version of NodeJS on Provider:", result.stdout.trim());
  } catch (err) {
    console.error("Running the task on Golem failed due to", err);
  } finally {
    await executor.shutdown();
  }
})();
