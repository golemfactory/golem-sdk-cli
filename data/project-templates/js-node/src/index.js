require("dotenv").config();
const { GolemNetwork } = require("@golem-sdk/golem-js");

const order = {
  demand: {
    workload: { imageTag: "golem/alpine:latest" },
  },
  market: {
    // 15 minutes
    rentHours: 15 / 60,
    pricing: {
      model: "linear",
      maxStartPrice: 0.5,
      maxCpuPerHourPrice: 1.0,
      maxEnvPerHourPrice: 0.5,
    },
  },
};

(async () => {
  const glm = new GolemNetwork();

  try {
    await glm.connect();
    // create a pool that can grow up to 3 rentals at the same time
    const pool = await glm.manyOf({
      poolSize: 3,
      order,
    });
    console.log("Starting work on Golem!");
    await Promise.allSettled([
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run("echo Hello, Golem from the first machine! 👋"))
          .then((res) => console.log(res.stdout)),
      ),
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run("echo Hello, Golem from the second machine! 👋"))
          .then((res) => console.log(res.stdout)),
      ),
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run("echo Hello, Golem from the third machine! 👋"))
          .then((res) => console.log(res.stdout)),
      ),
    ]);
  } catch (err) {
    console.error("Something went wrong:", err);
  } finally {
    await glm.disconnect();
  }
})().catch(console.error);
