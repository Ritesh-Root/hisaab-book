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
  parsedCounts: Record<AppName, number>;
  registerCount: number;
}
