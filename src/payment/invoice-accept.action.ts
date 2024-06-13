import { prompt } from "enquirer";
import Decimal from "decimal.js-light";
import { Table } from "console-table-printer";
import { PaymentApi } from "ya-ts-client";
import chalk from "chalk";
import { InvoiceAcceptOptions } from "./invoice.options";
import { GolemNetwork, InvoiceAcceptResult } from "@golem-sdk/golem-js";
import { fetchInvoices } from "./common";
import _ from "lodash";

async function askForConfirmation(invoices: PaymentApi.InvoiceDTO[], columns: InvoiceAcceptOptions["columns"]) {
  const invoicesToPay = [];

  let i = 0;
  for (const invoice of invoices) {
    const allColumns = {
      id: invoice.invoiceId,
      accepted: invoice.status !== "RECEIVED" ? "accepted" : "not accepted",
      status: invoice.status,
      amount: invoice.amount,
      timestamp: invoice.timestamp,
      platform: invoice.paymentPlatform,
      payer: invoice.payerAddr,
      issuer: invoice.payeeAddr,
      providerId: invoice.issuerId,
    };
    const selectedColumns = _.pick(allColumns, columns);

    console.log(
      `${++i}/${invoices.length}:\n` +
        Object.entries(selectedColumns)
          .map(([key, value]) => ` - ${chalk.bold(key)}:\t${value}`)
          .join("\n"),
    );
    const { decision } = (await prompt({
      type: "confirm",
      name: "decision",
      message: "Add this invoice to the list of invoices to accept?",
    })) as { decision: boolean };
    if (decision) {
      invoicesToPay.push(invoice);
    }
  }
  return invoicesToPay;
}

export async function acceptAction(options: InvoiceAcceptOptions) {
  const glm = new GolemNetwork({
    api: {
      key: options.yagnaAppkey,
      url: options.url,
    },
  });
  const paymentProcessor = glm.payment.createInvoiceProcessor();
  let invoices: PaymentApi.InvoiceDTO[];
  try {
    invoices = await fetchInvoices(options, paymentProcessor);
  } catch (e) {
    console.error(e);
    console.log(chalk.red("Failed to fetch invoices, check your parameters and try again."));
    process.exitCode = 1;
    return;
  }

  if (invoices.length === 0) {
    if (!options.silent) {
      console.log(chalk.blue.bold("No unaccepted invoices found"));
    }
    return;
  }
  const invoicesToPay = [];

  if (options.yes) {
    invoicesToPay.push(...invoices);
  } else {
    console.log(chalk.blue.bold(`Found ${invoices.length} unaccepted invoices:`));
    try {
      invoicesToPay.push(...(await askForConfirmation(invoices, options.columns)));

      if (invoicesToPay.length === 0) {
        console.log(chalk.blue.bold("No invoices selected"));
        return;
      }

      const invoicesOnTestnet = invoicesToPay.filter((invoice) =>
        invoice.paymentPlatform.toLowerCase().endsWith("-tglm"),
      );
      const invoicesOnMainnet = invoicesToPay.filter((invoice) =>
        invoice.paymentPlatform.toLowerCase().endsWith("-glm"),
      );
      if (invoicesOnTestnet.length > 0) {
        const totalTestGLM = invoicesOnTestnet.reduce((acc, invoice) => acc.add(invoice.amount), new Decimal(0));
        console.log(
          chalk.blue.bold(
            `Selected ${invoicesOnTestnet.length} invoices on Testnet for a total of ${totalTestGLM} tGLM`,
          ),
        );
      }
      if (invoicesOnMainnet.length > 0) {
        const totalRealGLM = invoicesOnMainnet.reduce((acc, invoice) => acc.add(invoice.amount), new Decimal(0));
        console.log(
          chalk.blue.bold(
            `Selected ${invoicesOnMainnet.length} invoices on Mainnet for a total of ${totalRealGLM} GLM`,
          ),
        );
      }
      const { decision } = (await prompt({
        type: "confirm",
        name: "decision",
        message:
          invoicesToPay.length === 1
            ? "Do you want to accept this invoice?"
            : `Do you want to accept these ${invoicesToPay.length} invoices?`,
      })) as { decision: boolean };
      if (!decision) {
        return;
      }
    } catch {
      process.exitCode = 1;
      console.log(chalk.red("Script cancelled"));
      return;
    }
  }

  const paymentResults = await paymentProcessor.acceptManyInvoices({
    invoices: invoicesToPay,
    dryRun: options.dryRun,
  });

  if (options.silent) {
    return;
  }

  const getRow = (result: InvoiceAcceptResult) => {
    return {
      invoiceId: result.invoiceId,
      status: (result.success ? "success" : "failed") + (result.dryRun ? " (dry run)" : ""),
      amount: result.amount,
      platform: result.allocation.paymentPlatform,
    };
  };

  if (options.format === "table") {
    const summaryTable = new Table();
    paymentResults.forEach((result) =>
      summaryTable.addRow(getRow(result), {
        color: result.dryRun ? "yellow" : result.success ? "green" : "red",
      }),
    );
    summaryTable.printTable();
  }

  if (options.format === "json") {
    console.log(JSON.stringify(paymentResults.map(getRow)));
  }

  if (options.format === "csv") {
    const rows = paymentResults.map(getRow);
    console.log(Object.keys(rows[0]).join(","));
    console.log(rows.map((row) => Object.values(row).join(",")).join("\n"));
  }
}
