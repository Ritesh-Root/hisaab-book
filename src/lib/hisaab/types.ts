export type AppName = "phonepe" | "gpay" | "paytm";
export type Stage = "parse" | "match" | "verify" | "report";
export type UploadStatus = "idle" | "parsing" | "parsed";

export interface Upload {
  app: AppName;
  status: UploadStatus;
  fileName?: string;
  txCount?: number;
}

export interface TxRow {
  id: string;
  app: AppName;
  utrLast4: string;
  amountPaise: number;
  timeIST: string;
  kind: "credit" | "register";
}

export type FindingKind = "missing" | "unsettled" | "duplicate";

export interface EvidenceRow {
  file: string;
  line: number;
  raw: string;
}

export interface Finding {
  id: string;
  kind: FindingKind;
  amountPaise: number;
  titleHi: string;
  titleEn: string;
  detailHi: string;
  detailEn: string;
  action: string;
  verified: boolean;
  evidence: EvidenceRow[];
}

export interface Summary {
  totalTx: number;
  matched: number;
  problems: number;
  missingPaise: number;
}

export type DemoState = "empty" | "parsing" | "matching" | "report";
