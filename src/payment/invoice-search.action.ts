import { InvoiceProcessor } from "@golem-sdk/golem-js";
import { Invoice } from "ya-ts-client/dist/ya-payment";
import { Table } from "console-table-printer";
import { InvoiceSearchOptions } from "./invoice.options";
import _ from "lodash";
import chalk from "chalk";
import { fetchInvoices } from "./common";

function printRows(invoices: Invoice[], options: InvoiceSearchOptions) {
  const getRow = (invoice: Invoice) => {
    const allColumns = {
      id: invoice.invoiceId,
      status: invoice.status,
      amount: invoice.amount,
      timestamp: invoice.timestamp,
      platform: invoice.paymentPlatform,
      payer: invoice.payerAddr,
      issuer: invoice.payeeAddr,
      providerId: invoice.issuerId,
    };
    return _.pick(allColumns, options.columns);
  };

  if (options.format === "table") {
    if (invoices.length === 0) {
      console.log(chalk.red("No invoices found"));
      return;
    }
    const table = new Table();
    invoices.forEach((invoice) => {
      const isHighlighted = invoice.status === "RECEIVED" || invoice.status === "ISSUED";
      const row = getRow(invoice);
      table.addRow(row, {
        color: isHighlighted ? "red" : "green",
      });
    });

    table.printTable();
    return;
  }
  if (options.format === "json") {
    console.log(JSON.stringify(invoices.map(getRow)));
    return;
  }
  if (options.format === "csv") {
    console.log(options.columns);
    console.log(
      invoices
        .map(getRow)
        .map((row) => Object.values(row).join(","))
        .join("\n"),
    );
    return;
  }
}

export async function searchAction(options: InvoiceSearchOptions) {
  const paymentProcessor = await InvoiceProcessor.create({
    apiKey: options.yagnaAppkey,
  });
  let invoices: Invoice[];
  try {
    invoices = await fetchInvoices(options, paymentProcessor);
  } catch {
    console.log(chalk.red("Failed to fetch invoices, check your parameters and try again"));
    return;
  }
  printRows(invoices, options);
}
