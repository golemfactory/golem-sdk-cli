import "dotenv/config";
import { GolemNetwork } from "@golem-sdk/golem-js";

(async () => {
  // Initialize a new GolemNetwork instance,
  // you can also pass additional options here like logger or api key
  const glm = new GolemNetwork();

  try {
    // Connect to the Golem network using the Yagna node
    await glm.connect();

    // Define the specifications for a market order
    const order = {
      demand: {
        // Specify workload options such as image tag from golem registry
        // or other criteria for rented machines
        workload: { imageTag: "golem/alpine:latest" },
      },
      market: {
        // Specify the rental time (15 minutes)
        rentHours: 15 / 60,
        pricing: {
          // Pricing model set to linear
          model: "linear",
          // Set the maximum starting price
          maxStartPrice: 0.5,
          // Set the maximum price per CPU per hour
          maxCpuPerHourPrice: 1.0,
          // Set the maximum price per environment per hour
          maxEnvPerHourPrice: 0.5,
        },
      },
    };

    // Create a pool that can handle up to 3 rentals simultaneously
    const pool = await glm.manyOf({
      poolSize: 3,
      order,
    });

    console.log("Starting work on Golem!");

    console.log("Running three different commands on a pool of three rented machines");

    // Execute three tasks concurrently, each on a different rented machine in the pool
    await Promise.allSettled([
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run(`echo Hello Golem from provider ${exe.provider.name} 😻`))
          .then((res) => console.log(res.stdout))
          .catch((err) => console.error(`Something went wrong:`, err)),
      ),
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run(`echo Hello Golem from provider ${exe.provider.name} 🤠`))
          .then((res) => console.log(res.stdout))
          .catch((err) => console.error(`Something went wrong:`, err)),
      ),
      pool.withRental(async (rental) =>
        rental
          .getExeUnit()
          .then((exe) => exe.run(`echo Hello Golem from provider ${exe.provider.name} 👻`))
          .then((res) => console.log(res.stdout))
          .catch((err) => console.error(`Something went wrong:`, err)),
      ),
    ]);

    console.log("Running a command on a single rented machine");

    // Acquire a single rental, execute a command, and log the output or an error
    const singleRental = await glm.oneOf({ order });
    await singleRental
      .getExeUnit()
      .then((exe) => exe.run(`echo Hello Golem from provider ${exe.provider.name} 👽`))
      .then((res) => console.log(res.stdout))
      .catch((err) => console.error(`Something went wrong:`, err));
  } catch (err) {
    console.error("Something went wrong:", err);
    throw err;
  } finally {
    // Disconnect from the Golem Network.
    // This will clear the rental pools and finalize and pay all rentals that were created within the Golem Network
    await glm.disconnect();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
