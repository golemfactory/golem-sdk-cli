import { PaymentProcessor } from "@golem-sdk/golem-js";
import { Invoice } from "ya-ts-client/dist/ya-payment";
import { Table } from "console-table-printer";
import { PaymentOptions } from "./payment.options";
import _ from "lodash";
import { prompt } from "enquirer";
import Decimal from "decimal.js-light";
import chalk from "chalk";

async function fetchInvoices(options: PaymentOptions, processor: PaymentProcessor) {
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
  });
}

function printRows(invoices: Invoice[], options: PaymentOptions) {
  const rows = invoices.map((invoice) => {
    const allColumns = {
      id: invoice.invoiceId,
      paid: invoice.status !== "RECEIVED" ? "paid" : "unpaid",
      status: invoice.status,
      amount: invoice.amount,
      timestamp: invoice.timestamp,
      platform: invoice.paymentPlatform,
      payer: invoice.payerAddr,
      issuer: invoice.payeeAddr,
      providerId: invoice.issuerId,
    };
    return _.pick(allColumns, options.columns);
  });

  if (options.format === "table") {
    if (rows.length === 0) {
      console.log("No invoices found");
      return;
    }
    const table = new Table();
    rows.forEach((row) =>
      table.addRow(row, { color: row["paid"] === undefined ? "white" : row["paid"] === "paid" ? "green" : "red" }),
    );
    table.printTable();
    return;
  }
  if (options.format === "json") {
    console.log(JSON.stringify(rows));
    return;
  }
  if (options.format === "csv") {
    console.log(options.columns);
    console.log(rows.map((row) => Object.values(row).join(",")).join("\n"));
    return;
  }
}

export async function paymentAction(options: PaymentOptions) {
  const paymentProcessor = await PaymentProcessor.create({
    apiKey: options.yagnaAppkey,
  });
  let invoices: Invoice[];
  try {
    invoices = await fetchInvoices(options, paymentProcessor);
    invoices.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch {
    console.log(chalk.red("Failed to fetch invoices, check your parameters and try again"));
    return;
  }

  if (!options.silent) {
    printRows(invoices, options);
  }
  if (options.pay) {
    const unpaidInvoices = invoices.filter((invoice) => invoice.status === "RECEIVED");
    await pay(options, unpaidInvoices, paymentProcessor);
  }
}

async function askForConfirmation(invoices: Invoice[]) {
  const invoicesToPay = [];

  let i = 0;
  for (const invoice of invoices) {
    console.log(
      `${++i}/${invoices.length}:\n` +
        ` - ${chalk.bold("Invoice id:\t")} ${invoice.invoiceId}\n` +
        ` - ${chalk.bold("Amount:\t")} ${invoice.amount}\n` +
        ` - ${chalk.bold("Timestamp:\t")} ${invoice.timestamp}\n` +
        ` - ${chalk.bold("Provider id:\t")} ${invoice.issuerId}\n` +
        ` - ${chalk.bold("Provider address:\t")} ${invoice.payeeAddr}`,
    );
    const { decision } = (await prompt({
      type: "confirm",
      name: "decision",
      message: "Do you want to pay this invoice?",
    })) as { decision: boolean };
    if (decision) {
      invoicesToPay.push(invoice);
    }
  }
  return invoicesToPay;
}

export async function pay(options: PaymentOptions, invoices: Invoice[], paymentProcessor: PaymentProcessor) {
  if (invoices.length === 0) {
    console.log(chalk.blue.bold("No unpaid invoices found"));
    return;
  }
  console.log(chalk.blue.bold(`Found ${invoices.length} unpaid invoices:\n`));
  const invoicesToPay = [];

  if (options.yes) {
    invoicesToPay.push(...invoices);
  } else {
    try {
      invoicesToPay.push(...(await askForConfirmation(invoices)));
    } catch {
      console.log(chalk.red("Script cancelled"));
      return;
    }

    const total = invoicesToPay.reduce((acc, invoice) => acc.add(invoice.amount), new Decimal(0));

    console.log(chalk.blue.bold(`${invoicesToPay.length} Invoices selected. Total amount to pay: ${total}`));
    try {
      const { decision } = (await prompt({
        type: "confirm",
        name: "decision",
        message: "Do you want to pay these invoices?",
      })) as { decision: boolean };
      if (!decision) {
        console.log(chalk.red("Payment cancelled"));
        return;
      }
    } catch {
      console.log(chalk.red("Payment cancelled"));
      return;
    }
  }

  await paymentProcessor.acceptManyInvoices({
    invoices: invoicesToPay,
    dryRun: options.dryRun,
  });

  if (options.silent) {
    return;
  }

  const summaryTable = new Table();
  paymentProcessor.stats.forEach((stat) =>
    summaryTable.addRow(
      {
        invoiceId: stat.invoiceId,
        status: (stat.success ? "success" : "failed") + (stat.dryRun ? " (dry run)" : ""),
        amount: stat.amount,
      },
      {
        color: stat.dryRun ? "yellow" : stat.success ? "green" : "red",
      },
    ),
  );
  summaryTable.printTable();
}
