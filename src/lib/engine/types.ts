import type { AppName, Finding, Summary } from "@/lib/hisaab/types";

export interface CanonicalTx {
  app: AppName;
  kind: "credit" | "register";
  utrFull: string;
  utrLast4: string;
  amountPaise: number;
  timeISO: string;
  status: "settled" | "pending" | "sale";
  line: number;
  raw: string;
  saleId?: string;
}

export interface ParsedFile {
  app: AppName | "register";
  fileName: string;
  headers: string[];
  txs: CanonicalTx[];
}

export interface ReconciliationResult {
  summary: Summary;
  findings: Finding[];
  ticker: import("@/lib/hisaab/types").TxRow[];
  /** UTR last-4s involved in verified findings — the UI flags these ticker rows. */
  flagUtrs: string[];
  parsedCounts: Record<AppName, number>;
  registerCount: number;
}
