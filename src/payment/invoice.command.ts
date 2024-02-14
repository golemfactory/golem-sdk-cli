import { Command, Option } from "commander";
import { InvoiceAcceptOptions, InvoiceSearchOptions } from "./invoice.options";
import { createInvoiceCommand } from "./common";

export const invoiceCommand = new Command("invoice").summary("Search and accept invoices.").addHelpText(
  "after",
  `
Examples:

Search for the first 10 invoices after 2023-01-01:
$ golem-sdk invoice search -k yagna-appkey --after 2023-01-01 --limit 10

Search for invoices issued by provider 0x1234 with status RECEIVED and print them in JSON format:
$ golem-sdk invoice search -k yagna-appkey --provider 0x1234 --status RECEIVED --format json

Search for invoices above 0.5 GLM on payment platform erc20-polygon-glm:
$ golem-sdk invoice search -k yagna-appkey --min-amount 0.5 --payment-platform erc20-polygon-glm

Search for invoices by their ID and only list their id, timestamp and payment platform:
$ golem-sdk invoice search -k yagna-appkey --invoice 0x1234 0x5678 --columns id timestamp platform

Accept all invoices from provider 0x1234 (interactive):
$ golem-sdk invoice accept -k yagna-appkey --provider 0x1234

Accept all invoices from provider 0x1234 (auto-accept):
$ golem-sdk invoice accept -k yagna-appkey --provider 0x1234 --yes

Accept all invoices from provider 0x1234 (dry run):
$ golem-sdk invoice accept -k yagna-appkey --provider 0x1234 --dry-run
`,
);

const searchCommand = createInvoiceCommand("search")
  .summary("Search for invoices.")
  .allowUnknownOption(false)
  .action(async (options: InvoiceSearchOptions) => {
    const action = await import("./invoice-search.action.js");
    await action.default.searchAction(options);
  });

const payCommand = createInvoiceCommand("accept")
  .summary("Accept invoices. This command is interactive by default and takes the same options as search.")
  .addOption(new Option("-y --yes", "Skip confirmation").default(false))
  .addOption(new Option("--dry-run", "Dry run").default(false))
  .addOption(new Option("-s, --silent", "Don't print anything to stdout").default(false))
  .allowUnknownOption(false)
  .action(async (options: InvoiceAcceptOptions) => {
    const action = await import("./invoice-accept.action.js");
    await action.default.acceptAction(options);
  });

invoiceCommand.addCommand(searchCommand).addCommand(payCommand);
