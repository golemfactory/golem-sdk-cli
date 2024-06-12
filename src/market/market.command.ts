import { Command, Option } from "commander";
import { GolemNetwork, MarketOrderSpec, OfferProposal, ProposalFilterFactory } from "@golem-sdk/golem-js";
import chalk from "chalk";
import { switchMap, filter, scan, takeUntil, timer, last } from "rxjs";

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
  image: string;
  minCpuCores: string;
  minCpuThreads: string;
  minMemGib: string;
  minStorageGib: string;
  maxStartPrice: string;
  maxCpuPerHourPrice: string;
  maxEnvPerHourPrice: string;
  engine: string;
  capabilities: string[];
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
  .option("-t, --scan-time <sec>", "Number of seconds to scan the market", "30")
  .option("--payment-network <name>", "The payment network to use", "polygon")
  .option("--payment-driver <name>", "The payment driver to use", "erc20")
  .option("--subnet-tag <name>", "The Golem Network's subnet to use", "public")
  .option("--image <name>", "The Golem Registry image to use for the query", "golem/node:20-alpine")
  .option("--min-cpu-cores <c>", "The minimal number of CPU cores to look for", "1")
  .option("--min-cpu-threads <t>", "The minimal number of CPU threads to look for", "1")
  .option("--min-mem-gib <m>", "The minimal memory size to look for", "0.5")
  .option("--min-storage-gib <s>", "The minimal storage size to look for", "0.5")
  .option("--max-start-price <sp>", "The max start price you're willing to pay (in GLM)", "10")
  .option("--max-cpu-per-hour-price <sp>", "The max ENV price you're willing to pay (in GLM)", "10")
  .option("--max-env-per-hour-price <sp>", "The max CPU time price you're willing to pay (in GLM/h)", "10")
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

    const maxStartPrice = parseFloat(options.maxStartPrice);
    const maxCpuPerHourPrice = parseFloat(options.maxCpuPerHourPrice);
    const maxEnvPerHourPrice = parseFloat(options.maxEnvPerHourPrice);

    const subnetTag = options.subnetTag;

    const imageTag = options.image;
    const minCpuCores = parseInt(options.minCpuCores);
    const minCpuThreads = parseInt(options.minCpuThreads);
    const minMemGib = parseFloat(options.minMemGib);
    const minStorageGib = parseFloat(options.minStorageGib);
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
      console.log(
        "Requirements for image '%s', %d cores, %d threads, %dGiB of memory, %dGiB of storage",
        imageTag,
        minCpuCores,
        minCpuThreads,
        minMemGib,
        minStorageGib,
      );
      console.log(
        "Price limitations: max start price %d GLM, max CPU price %d GLM/h, max ENV price %d, GLM/h",
        maxStartPrice.toFixed(4),
        maxCpuPerHourPrice.toFixed(4),
        maxEnvPerHourPrice.toFixed(4),
      );
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

    const priceLimiter = ProposalFilterFactory.limitPriceFilter({
      start: maxStartPrice,
      cpuPerSec: maxCpuPerHourPrice / 3600,
      envPerSec: maxEnvPerHourPrice / 3600,
    });

    const scanningFilter = (p: OfferProposal) => {
      const withinPriceRange = priceLimiter(p);
      const isValidProviderId = providerIdFilter(p.provider.id);
      const isValidProviderName = providerNameFilter(p.provider.name);
      const isValidProviderWallet = providerWalletFilter(p.provider.walletAddress);

      return withinPriceRange && isValidProviderId && isValidProviderName && isValidProviderWallet;
    };

    const order: MarketOrderSpec = {
      demand: {
        subnetTag,
        expirationSec: scanTime,
        workload: {
          imageTag,
          minCpuCores,
          minCpuThreads,
          minMemGib,
          minStorageGib,
          capabilities,
          engine,
        },
      },
      market: {
        rentHours: scanTime / 3600,
        pricing: {
          model: "linear",
          maxCpuPerHourPrice,
          maxEnvPerHourPrice,
          maxStartPrice,
        },
        proposalFilter: scanningFilter,
      },
    };

    const allocation = await glm.payment.createAllocation({
      budget: 0,
      expirationSec: scanTime,
    });
    const demandSpec = await glm.market.buildDemandDetails(order.demand, allocation);

    glm.market
      .publishAndRefreshDemand(demandSpec)
      .pipe(
        switchMap((demand) => glm.market.collectAllOfferProposals(demand)),
        filter(scanningFilter),
        scan((acc, proposal) => {
          acc.push(proposal);
          return acc;
        }, [] as OfferProposal[]),
        takeUntil(timer(scanTime * 1000)),
        last(),
      )
      .subscribe({
        next: (proposals) => {
          if (!options.silent) {
            console.log("Scan finished, here are the results");
            console.log("Your market query was matched with %d proposals", proposals.length);
          }

          const displayProposals = proposals.map((p) => {
            const memory = p.getDto()["memory"];
            const storage = p.getDto()["storage"];
            return {
              providerId: p.provider.id,
              providerName: p.provider.name,
              startPrice: unifyPrice(p.pricing.start),
              cpuPerHourPrice: unifyPrice(p.pricing.cpuSec * 3600),
              envPerHourPrice: unifyPrice(p.pricing.envSec * 3600),
              cpuCores: p.getDto()["cpuCores"],
              cpuThreads: p.getDto()["cpuThreads"],
              memoryGib: memory ? parseFloat(memory.toFixed(1)) : "N/A",
              storageGib: storage ? parseFloat(storage.toFixed(1)) : "N/A",
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
