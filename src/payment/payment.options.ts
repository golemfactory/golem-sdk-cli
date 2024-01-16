export interface PaymentOptions {
  yagnaAppkey: string;
  after: Date;
  limit: number;
  provider?: string[];
  wallet?: string[];
  minAmount?: number;
  maxAmount?: number;
  columns: string[];
  status: string[];
  invoice?: string[];
  format: "table" | "json" | "csv";
  pay: boolean;
  yes: boolean;
  dryRun: boolean;
  silent: boolean;
}
