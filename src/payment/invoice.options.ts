export interface InvoiceSearchOptions {
  yagnaAppkey: string;
  url: string;
  after: Date;
  limit: number;
  provider?: string[];
  wallet?: string[];
  minAmount?: number;
  maxAmount?: number;
  paymentPlatform?: string[];
  columns: string[];
  status: string[];
  invoice?: string[];
  format: "table" | "json" | "csv";
}

export interface InvoiceAcceptOptions extends InvoiceSearchOptions {
  yes: boolean;
  dryRun: boolean;
  silent: boolean;
}
