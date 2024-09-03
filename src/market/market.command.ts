import { Command, Option } from "commander";
import { GolemNetwork, ScanOptions, ScannedOffer } from "@golem-sdk/golem-js";
import chalk from "chalk";
import { filter, takeUntil, timer, toArray } from "rxjs";

export const marketCommand = new Command("market");

marketCommand.description("Commands providing insights from the market");

const unifyPrice = (price: number) => parseFloat(price.toFixed(4));

type MarketScanOptions = {
  yagnaAppkey: string;
  yagnaUrl: string;
  scanTime: string;
  paymentNetwork: string;
  paymentDriver: string;
  subnetTag: string;
  engine?: string;
  capabilities?: string[];
  minMemGib?: string;
  maxMemGib?: string;
  minStorageGib?: string;
  maxStorageGib?: string;
  minCpuThreads?: string;
  maxCpuThreads?: string;
  minCpuCores?: string;
  maxCpuCores?: string;
  maxHourPrice?: string;
  providerId?: string[];
  providerName?: string[];
  providerWallet?: string[];
  output: "table" | "json";
  silent: boolean;
};

marketCommand
  .command("scan")
  .description("Runs a scan of the market with your criteria and presents results")
  .addOption(new Option("-k, --yagna-appkey <key>", "Yagna app key to use").env("YAGNA_APPKEY").makeOptionMandatory())
  .option("--yagna-url <url>", "Yagna API URL", "http://127.0.0.1:7465")
  .option("-t, --scan-time <sec>", "Number of seconds to scan the market", "10")
  .option("--payment-network <name>", "The payment network to use", "polygon")
  .option("--payment-driver <name>", "The payment driver to use", "erc20")
  .option("--subnet-tag <name>", "The Golem Network's subnet to use", "public")
  .option("--min-cpu-cores <c>", "The minimal number of CPU cores to look for")
  .option("--max-cpu-cores <c>", "The maximum number of CPU cores to look for")
  .option("--min-cpu-threads <t>", "The minimal number of CPU threads to look for")
  .option("--max-cpu-threads <t>", "The maximum number of CPU threads to look for")
  .option("--min-mem-gib <m>", "The minimal memory size to look for")
  .option("--max-mem-gib <m>", "The maximum memory size to look for")
  .option("--min-storage-gib <s>", "The minimal storage size to look for")
  .option("--max-storage-gib <s>", "The maximum storage size to look for")
  .option(
    "--max-hour-price <price>",
    "The maximum price per hour of work to look for (start price + CPU/sec * 3600 + env/sec * 3600)",
  )
  .option("--engine <type>", "The runtime that you are interested in", "vm")
  .option("--capabilities [capabilities...]", "List of capabilities listed in the offers", [])
  .option("--provider-id [id...]", "Filter the results to only include proposals from providers with the given ids")
  .option(
    "--provider-name [name...]",
    "Filter the results to only include proposals from providers with the given names",
  )
  .option(
    "--provider-wallet [wallet...]",
    "Filter the results to only include proposals from providers with the given wallet addresses",
  )
  .option("-o, --output <type>", "Controls how to present the results (table, json)", "table")
  .option("-s, --silent", "Controls if verbose output should be presented", false)
  .action(async (options: MarketScanOptions) => {
    const scanTime = parseInt(options.scanTime);

    const paymentNetwork = options.paymentNetwork;
    const paymentDriver = options.paymentDriver;

    const subnetTag = options.subnetTag;

    const minCpuCores = options.minCpuCores !== undefined ? parseInt(options.minCpuCores) : undefined;
    const maxCpuCores = options.maxCpuCores !== undefined ? parseInt(options.maxCpuCores) : undefined;
    const minCpuThreads = options.minCpuThreads !== undefined ? parseInt(options.minCpuThreads) : undefined;
    const maxCpuThreads = options.maxCpuThreads !== undefined ? parseInt(options.maxCpuThreads) : undefined;
    const minMemGib = options.minMemGib !== undefined ? parseFloat(options.minMemGib) : undefined;
    const maxMemGib = options.maxMemGib !== undefined ? parseFloat(options.maxMemGib) : undefined;
    const minStorageGib = options.minStorageGib !== undefined ? parseFloat(options.minStorageGib) : undefined;
    const maxStorageGib = options.maxStorageGib !== undefined ? parseFloat(options.maxStorageGib) : undefined;
    const maxHourPrice = options.maxHourPrice !== undefined ? parseFloat(options.maxHourPrice) : undefined;
    const engine = options.engine;
    const capabilities = options.capabilities;
    const providerIdFilter = (id: string) => (options.providerId ? options.providerId.includes(id) : true);
    const providerNameFilter = (name: string) => (options.providerName ? options.providerName.includes(name) : true);
    const providerWalletFilter = (wallet: string) =>
      options.providerWallet ? options.providerWallet.includes(wallet) : true;

    if (!options.silent) {
      console.log("Querying Golem Network for proposals matching your criteria");
      console.log("");
      console.log("Scan time: %d seconds", scanTime);
      console.log("Golem Network subnet tag:", subnetTag);
      console.log("Payment network and driver:", paymentNetwork, paymentDriver);
      console.log("Golem engine:", engine);
      console.log("Provider capabilities:", capabilities);
      console.log("Requirements:");
      if (minCpuCores) console.log("  - Minimum number of CPU cores:", minCpuCores);
      if (maxCpuCores) console.log("  - Maximum number of CPU cores:", maxCpuCores);
      if (minCpuThreads) console.log("  - Minimum number of CPU threads:", minCpuThreads);
      if (maxCpuThreads) console.log("  - Maximum number of CPU threads:", maxCpuThreads);
      if (minMemGib) console.log("  - Minimum memory size:", minMemGib);
      if (maxMemGib) console.log("  - Maximum memory size:", maxMemGib);
      if (minStorageGib) console.log("  - Minimum storage size:", minStorageGib);
      if (maxStorageGib) console.log("  - Maximum storage size:", maxStorageGib);
      if (maxHourPrice) console.log("  - Maximum price per hour:", maxHourPrice);
    }

    const glm = new GolemNetwork({
      api: {
        key: options.yagnaAppkey,
        url: options.yagnaUrl,
      },
    });

    try {
      await glm.connect();
    } catch (e) {
      console.error(
        chalk.red(
          "Failed to connect to Yagna, check if Yagna is running and the --yagna-url and --yagna-appkey are correct",
        ),
      );
      process.exitCode = 1;
      return;
    }

    const priceFilter = (offer: ScannedOffer) => {
      if (!maxHourPrice) {
        return true;
      }

      const hourlyPrice =
        offer.pricing.start + offer.pricing.cpuSec * 3600 * offer.cpuThreads + offer.pricing.envSec * 3600;

      return hourlyPrice <= maxHourPrice;
    };

    const scanOptions: ScanOptions = {
      workload: {
        capabilities,
        engine,
        maxCpuCores,
        maxCpuThreads,
        maxMemGib,
        maxStorageGib,
        minCpuCores,
        minCpuThreads,
        minMemGib,
        minStorageGib,
      },
      payment: {
        network: paymentNetwork,
        driver: paymentDriver,
      },
      subnetTag,
    };

    const scanSpecification = glm.market.buildScanSpecification(scanOptions);

    const paymentToken = ["mainnet", "polygon"].includes(paymentNetwork) ? "glm" : "tglm";
    const paymentPlatform = `${paymentDriver}-${paymentNetwork}-${paymentToken}`;

    glm.market
      .scan(scanSpecification)
      .pipe(
        filter((offer) => priceFilter(offer)),
        filter((offer) => providerIdFilter(offer.provider.id)),
        filter((offer) => providerNameFilter(offer.provider.name)),
        filter((offer) =>
          providerWalletFilter(offer.properties[`golem.com.payment.platform.${paymentPlatform}.address`] as string),
        ),
        takeUntil(timer(scanTime * 1000)),
        toArray(),
      )
      .subscribe({
        next: (offersFound) => {
          if (!options.silent) {
            console.log("Scan finished, here are the results");
            console.log("Your market query was matched with %d proposals", offersFound.length);
          }

          const displayProposals = offersFound.map((offer) => {
            const memory = offer.memoryGib;
            const storage = offer.storageGib;
            const runtimeName = offer.runtimeName;
            const runtimeVersion = offer.properties["golem.runtime.version"];

            return {
              providerId: offer.provider.id,
              providerName: offer.provider.name,
              startPrice: unifyPrice(offer.pricing.start),
              cpuPerHourPrice: unifyPrice(offer.pricing.cpuSec * 3600),
              envPerHourPrice: unifyPrice(offer.pricing.envSec * 3600),
              cpuCores: offer.cpuCores,
              cpuThreads: offer.cpuThreads,
              memoryGib: memory ? parseFloat(memory.toFixed(1)) : "N/A",
              storageGib: storage ? parseFloat(storage.toFixed(1)) : "N/A",
              runtimeName,
              runtimeVersion,
            };
          });

          switch (options.output) {
            case "json":
              console.log(JSON.stringify(displayProposals));
              break;
            case "table":
            default:
              console.table(displayProposals);
              break;
          }
        },
        complete: () => {
          if (!options.silent) {
            console.log("Scan completed, disconnecting from the network...");
          }
          void glm.disconnect();
        },
        error: (e) => {
          if (!options.silent) {
            console.error(chalk.red("An error occurred during the scan"), e);
          }
          void glm.disconnect();
        },
      });
  });
