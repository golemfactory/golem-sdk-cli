import { Command, InvalidArgumentError, Option } from "commander";
import { InvoiceSearchOptions } from "./invoice.options";
import { InvoiceProcessor } from "@golem-sdk/golem-js";
import { PaymentApi } from "ya-ts-client";

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

export function createInvoiceCommand(name: string): Command {
  return new Command(name)
    .addOption(new Option("-k, --yagna-appkey <key>", "Yagna app key").env("YAGNA_APPKEY").makeOptionMandatory())
    .addOption(
      new Option("--url <url>", "Yagna url (including port)").env("YAGNA_API_URL").default("http://127.0.0.1:7465"),
    )
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
      "Columns to display. Valid options are: id, status, amount, timestamp, platform, payer, issuer, providerId",
      ["id", "status", "amount", "timestamp", "providerId", "platform"],
    )
    .option("--wallet [wallet...]", "Search by wallet address")
    .option("--min-amount <minAmount>", "Search by minimum invoice amount")
    .option("--max-amount <maxAmount>", "Search by maximum invoice amount")
    .option(
      "--status [status...]",
      "Search by invoice status. For example to search for invoices you received but did not accept yet, use `--status RECEIVED`. Valid options are: ISSUED, RECEIVED, ACCEPTED, REJECTED, FAILED, SETTLED, CANCELLED.",
      ["RECEIVED", "ACCEPTED", "SETTLED"],
    )
    .option("--payment-platform [paymentPlatform...]", "Search by payment platform")
    .option(
      "-i --invoice [invoice...]",
      "Instead of searching, fetch specific invoices by ID. If this option is used, all other search options are ignored.",
    )
    .option("-f, --format <format>", "Output format: table, json, csv.", "table");
}

export async function fetchInvoices(
  options: InvoiceSearchOptions,
  processor: InvoiceProcessor,
): Promise<PaymentApi.InvoiceDTO[]> {
  if (options.invoice && options.invoice.length > 0) {
    return Promise.all(options.invoice.map(async (invoiceId) => processor.fetchSingleInvoice(invoiceId)));
  }
  return processor.collectInvoices({
    limit: options.limit,
    after: options.after,
    statuses: options.status,
    providerIds: options.provider,
    providerWallets: options.wallet,
    minAmount: options.minAmount,
    maxAmount: options.maxAmount,
    paymentPlatforms: options.paymentPlatform,
  });
}
