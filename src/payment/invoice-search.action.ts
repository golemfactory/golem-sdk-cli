import { GolemNetwork } from "@golem-sdk/golem-js";
import { PaymentApi } from "ya-ts-client";
import { Table } from "console-table-printer";
import { InvoiceSearchOptions } from "./invoice.options";
import _ from "lodash";
import chalk from "chalk";
import { fetchInvoices } from "./common";

function printRows(invoices: PaymentApi.InvoiceDTO[], options: InvoiceSearchOptions) {
  const getRow = (invoice: PaymentApi.InvoiceDTO) => {
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
  } catch {
    console.log(chalk.red("Failed to fetch invoices, check your parameters and try again"));
    return;
  }
  printRows(invoices, options);
}
