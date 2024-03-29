import { Command, Option } from "commander";
import {
  AgreementPoolService,
  MarketService,
  Package,
  PaymentService,
  Proposal,
  ProposalFilterFactory,
  Yagna,
} from "@golem-sdk/golem-js";
import chalk from "chalk";

export const marketCommand = new Command("market");

marketCommand.description("Commands providing insights from the market");

const unifyPrice = (price: number) => parseFloat(price.toFixed(4));

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
  .option("--capabilities [capabilities...]", "List of capabilities listed in the offers")
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
  .option("-s, --silent", "Controls if verbose output should be presented")
  .action(async (options) => {
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

    const yagna = new Yagna({
      apiKey: options.yagnaAppkey,
      basePath: options.yagnaUrl,
    });

    try {
      await yagna.connect();
    } catch (e) {
      console.error(
        chalk.red(
          "Failed to connect to Yagna, check if Yagna is running and the --yagna-url and --yagna-appkey are correct",
        ),
      );
      process.exitCode = 1;
      return;
    }
    const api = yagna.getApi();

    const paymentService = new PaymentService(api, {
      payment: {
        network: paymentNetwork,
        driver: paymentDriver,
      },
    });

    const agreementService = new AgreementPoolService(api);

    const proposals: Proposal[] = [];

    const priceLimiter = ProposalFilterFactory.limitPriceFilter({
      start: maxStartPrice,
      cpuPerSec: maxCpuPerHourPrice / 3600,
      envPerSec: maxEnvPerHourPrice / 3600,
    });

    const scanningFilter = (p: Proposal) => {
      const withinPriceRange = priceLimiter(p);
      const isValidProviderId = providerIdFilter(p.provider.id);
      const isValidProviderName = providerNameFilter(p.provider.name);
      const isValidProviderWallet = providerWalletFilter(p.provider.walletAddress);

      if (withinPriceRange && isValidProviderId && isValidProviderName && isValidProviderWallet) {
        proposals.push(p);
      }
      // Do not negotiate with anyone
      return false;
    };

    const marketService = new MarketService(agreementService, api, {
      subnetTag: subnetTag,
      expirationSec: scanTime,
      proposalFilter: scanningFilter,
    });

    const workload = Package.create({
      imageTag: imageTag,
      minCpuCores: minCpuCores,
      minCpuThreads: minCpuThreads,
      minMemGib: minMemGib,
      minStorageGib: minStorageGib,
      capabilities,
      engine,
    });

    const allocation = await paymentService.createAllocation({
      budget: 0,
      expirationSec: scanTime,
    });

    await marketService.run(workload, allocation);

    setTimeout(async () => {
      if (!options.silent) {
        console.log("Scan finished, here are the results");
        console.log("Your market query was matched with %d proposals", proposals.length);
      }

      const displayProposals = proposals.map((p) => {
        return {
          providerId: p.provider.id,
          providerName: p.provider.name,
          startPrice: unifyPrice(p.pricing.start),
          cpuPerHourPrice: unifyPrice(p.pricing.cpuSec * 3600),
          envPerHourPrice: unifyPrice(p.pricing.envSec * 3600),
          cpuCores: p.details["cpuCores"],
          cpuThreads: p.details["cpuThreads"],
          memoryGib: parseFloat(p.details["memory"].toFixed(1)),
          storageGib: parseFloat(p.details["storage"].toFixed(1)),
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

      await marketService.end();
    }, scanTime * 1000);
  });
