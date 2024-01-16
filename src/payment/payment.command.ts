import { Command, InvalidArgumentError, Option } from "commander";
import { PaymentOptions } from "./payment.options";

function parseIntOrThrow(value: string) {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue) || parsedValue < 0) {
    throw new InvalidArgumentError("Not a valid positive integer.");
  }
  return parsedValue;
}
function parseDateOrThrow(value: string) {
  const parsedValue = new Date(value);
  if (isNaN(parsedValue.getTime())) {
    throw new InvalidArgumentError("Not a valid date.");
  }
  return parsedValue;
}

export const paymentCommand = new Command("payment")
  .summary("View and manage invoices")
  .addOption(new Option("-k, --yagna-appkey <key>", "Yagna app key").env("YAGNA_APPKEY").makeOptionMandatory())
  .addOption(
    new Option("--after <after>", "Search for invoices after this date")
      .default(new Date(0))
      .argParser(parseDateOrThrow),
  )
  .addOption(
    new Option("--limit <limit>", "Limit the number of invoices returned by the search")
      .default(50)
      .argParser(parseIntOrThrow),
  )
  .addOption(new Option("--provider [provider...]", "Search by provider ID"))
  .option(
    "--columns [columns...]",
    "Columns to display. Valid options are: id, paid, status, amount, timestamp, platform, payer, issuer, providerId",
    ["id", "paid", "status", "amount", "timestamp"],
  )
  .option("--wallet [wallet...]", "Search by wallet address")
  .option("--min-amount <minAmount>", "Search by minimum invoice amount")
  .option("--max-amount <maxAmount>", "Search by maximum invoice amount")
  .option(
    "--status [status...]",
    "Search by invoice status. Valid options are: ISSUED, RECEIVED, ACCEPTED, REJECTED, FAILED, SETTLED, CANCELLED. To search for unpaid invoices use: RECEIVED",
    ["RECEIVED", "ACCEPTED", "SETTLED"],
  )
  .addOption(
    new Option(
      "-i, --invoice [invoices...]",
      "Instead of searching for invoices, list or pay for the invoices specified by this option.",
    )
      .conflicts("limit")
      .conflicts("after")
      .conflicts("providerId")
      .conflicts("wallet")
      .conflicts("minAmount")
      .conflicts("maxAmount"),
  )
  .option("-f, --format <format>", "Output format: table, json, csv.", "table")
  .addOption(
    new Option(
      "-p, --pay",
      "Pay for unpaid invoices returned by the query or for the invoices specified by --invoice",
    ).default(false),
  )
  .addOption(new Option("-y --yes", "Skip confirmation when paying").default(false))
  .addOption(new Option("--dry-run", "Dry run").default(false))
  .addOption(new Option("-s, --silent", "Don't print anything to stdout").default(false).conflicts("format"))
  .allowUnknownOption(false)
  .action(async (options: PaymentOptions) => {
    const action = await import("./payment.action.js");
    await action.default.paymentAction(options);
  })
  .addHelpText(
    "after",
    `
Examples:
Search the first 25 invoices issued after 2021-01-01:
$ golem-sdk payment -k <appkey> --after 2021-01-01 --limit 25

Search the invoices issued by providers 0x1234 or 0x4321 and display only id and amount:
$ golem-sdk payment -k <appkey> --status RECEIVED --providerId 0x1234 0x4321 --limit 100 --columns id amount

Search for invoices issued by wallet address 0x1234 that are above 0.5 GLM:
$ golem-sdk payment -k <appkey> --min-amount 0.5 --wallet 0x1234

Search for the first 25 invoices issued after 2021-01-01 and display id amount and providerId in JSON format:
$ golem-sdk payment -k <appkey> --after 2021-01-01 --limit 25 --columns id amount providerId --format json

Pay for the first 25 unpaid invoices issued after 2021-01-01 (interactively):
$ golem-sdk payment -k <appkey> --after 2021-01-01 --limit 25 --status RECEIVED --pay

Pay for the first 25 unpaid invoices issued after 2021-01-01 (auto-confirm):
$ golem-sdk payment -k <appkey> --after 2021-01-01 --limit 25 --status RECEIVED --pay --yes

Pay for a specific invoice:
$ golem-sdk payment -k <appkey> --invoice 0x1234 --pay
`,
  );
