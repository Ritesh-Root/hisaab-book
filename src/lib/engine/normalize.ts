import type { AppName } from "@/lib/hisaab/types";
import { UnknownFormatError, type ParsedCsv } from "./csv";
import type { CanonicalTx, ParsedFile } from "./types";

/**
 * Normalize a header string for comparison: lowercase, trim, strip underscores/hyphens/spaces.
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, "");
}

/**
 * Find the index of a column by normalized name. Returns -1 if not found.
 */
function findCol(headers: string[], ...candidates: string[]): number {
  const normHeaders = headers.map(normalizeHeader);
  for (const c of candidates) {
    const norm = normalizeHeader(c);
    const idx = normHeaders.indexOf(norm);
    if (idx >= 0) return idx;
  }
  return -1;
}

/**
 * Parse a rupee amount string to paise (integer).
 * Handles "1850.00", "1,850.00", "  620.00" etc.
 */
export function rupeesToPaise(s: string): number {
  const cleaned = s.replace(/,/g, "").trim();
  return Math.round(parseFloat(cleaned) * 100);
}

/**
 * Parse a datetime string like "2024-07-18 18:47" into ISO 8601 with IST offset.
 * Also handles ISO strings and other common formats.
 */
export function parseTimeToISO(s: string): string {
  const trimmed = s.trim();
  // If it already looks like ISO with timezone, return as-is
  if (/T.*[Z+]/.test(trimmed)) return trimmed;

  // "2024-07-18 18:47" or "2024-07-18 18:47:00" → add IST offset
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}(?::\d{2})?)$/);
  if (m) {
    return `${m[1]}T${m[2]}:00+05:30`;
  }

  // Fallback: try Date parse and convert
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  return trimmed;
}

/**
 * Extract last 4 characters of a UTR string.
 */
function utrLast4(utr: string): string {
  const trimmed = utr.trim();
  return trimmed.length >= 4 ? trimmed.slice(-4) : trimmed;
}

// ─── Per-app normalizers ──────────────────────────────────────────

interface ColMap {
  txnId: number;
  datetime: number;
  amount: number;
  status: number;
  utr: number;
  type?: number; // for phonepe CREDIT/DEBIT
}

function mapPhonePe(headers: string[]): ColMap {
  const txnId = findCol(headers, "txn_id", "transaction id", "txnid");
  const datetime = findCol(headers, "datetime", "date", "time", "date and time");
  const amount = findCol(headers, "amount", "amt");
  const status = findCol(headers, "status");
  const utr = findCol(headers, "utr", "utr number", "reference");
  const type = findCol(headers, "type", "transaction type");

  const missing: string[] = [];
  if (txnId < 0) missing.push("txn_id");
  if (datetime < 0) missing.push("datetime");
  if (amount < 0) missing.push("amount");
  if (status < 0) missing.push("status");
  if (utr < 0) missing.push("utr");
  if (missing.length > 0) throw new UnknownFormatError(missing, "phonepe");

  return { txnId, datetime, amount, status, utr, type: type >= 0 ? type : undefined };
}

function mapGpay(headers: string[]): ColMap {
  const txnId = findCol(headers, "utc_timestamp", "timestamp", "txn_id");
  const datetime = findCol(headers, "utc_timestamp", "timestamp", "date");
  const amount = findCol(headers, "amount", "amt");
  const status = findCol(headers, "status");
  const utr = findCol(headers, "utr", "utr number", "reference");

  const missing: string[] = [];
  if (txnId < 0) missing.push("utc_timestamp/txn_id");
  if (datetime < 0) missing.push("utc_timestamp");
  if (amount < 0) missing.push("amount");
  if (status < 0) missing.push("status");
  if (utr < 0) missing.push("utr");
  if (missing.length > 0) throw new UnknownFormatError(missing, "gpay");

  return { txnId, datetime, amount, status, utr };
}

function mapPaytm(headers: string[]): ColMap {
  const txnId = findCol(headers, "txn_id", "transaction id");
  const datetime = findCol(headers, "received_at", "datetime", "date", "time");
  const amount = findCol(headers, "amount", "amt");
  const status = findCol(headers, "status");
  const utr = findCol(headers, "utr", "utr number", "reference");

  const missing: string[] = [];
  if (txnId < 0) missing.push("txn_id");
  if (datetime < 0) missing.push("received_at");
  if (amount < 0) missing.push("amount");
  if (status < 0) missing.push("status");
  if (utr < 0) missing.push("utr");
  if (missing.length > 0) throw new UnknownFormatError(missing, "paytm");

  return { txnId, datetime, amount, status, utr };
}

function normalizeStatus(raw: string): "settled" | "pending" {
  const s = raw.trim().toUpperCase();
  if (s === "SETTLED" || s === "SUCCESS" || s === "COMPLETED") return "settled";
  return "pending";
}

/**
 * Normalize a parsed CSV into CanonicalTx[] for a given app.
 */
export function normalizeStatement(parsed: ParsedCsv, app: AppName, fileName: string): ParsedFile {
  let colMap: ColMap;
  switch (app) {
    case "phonepe":
      colMap = mapPhonePe(parsed.headers);
      break;
    case "gpay":
      colMap = mapGpay(parsed.headers);
      break;
    case "paytm":
      colMap = mapPaytm(parsed.headers);
      break;
  }

  const txs: CanonicalTx[] = [];
  for (const row of parsed.rows) {
    const vals = row.values;
    // For phonepe, if there's a type column, only include CREDIT rows
    if (app === "phonepe" && colMap.type !== undefined) {
      const typeVal = (vals[colMap.type] ?? "").trim().toUpperCase();
      if (typeVal !== "CREDIT") continue;
    }

    const statusRaw = vals[colMap.status] ?? "";
    // Skip FAILED transactions
    if (statusRaw.trim().toUpperCase() === "FAILED") continue;

    const utrFull = (vals[colMap.utr] ?? "").trim();
    const amountPaise = rupeesToPaise(vals[colMap.amount] ?? "0");

    txs.push({
      app,
      kind: "credit",
      utrFull,
      utrLast4: utrLast4(utrFull),
      amountPaise,
      timeISO: parseTimeToISO(vals[colMap.datetime] ?? ""),
      status: normalizeStatus(statusRaw),
      line: row.line,
      raw: row.raw,
    });
  }

  return { app, fileName, headers: parsed.headers, txs };
}

// ─── Register normalizer ──────────────────────────────────────────

interface RegisterColMap {
  saleId: number;
  datetime: number;
  amount: number;
  mode: number;
  app: number;
  utrExpected: number;
  note?: number;
}

function mapRegister(headers: string[]): RegisterColMap {
  const saleId = findCol(headers, "sale_id", "saleid", "id");
  const datetime = findCol(headers, "datetime", "date", "time");
  const amount = findCol(headers, "amount", "amt");
  const mode = findCol(headers, "mode", "payment mode");
  const app = findCol(headers, "app", "payment app");
  const utrExpected = findCol(headers, "utr_expected", "utr expected", "utr");
  const note = findCol(headers, "note", "notes", "remark");

  const missing: string[] = [];
  if (saleId < 0) missing.push("sale_id");
  if (datetime < 0) missing.push("datetime");
  if (amount < 0) missing.push("amount");
  if (mode < 0) missing.push("mode");
  if (app < 0) missing.push("app");
  if (utrExpected < 0) missing.push("utr_expected");
  if (missing.length > 0) throw new UnknownFormatError(missing, "register");

  return { saleId, datetime, amount, mode, app, utrExpected, note: note >= 0 ? note : undefined };
}

/**
 * Normalize a parsed register CSV into CanonicalTx[] (kind="register").
 */
export function normalizeRegister(parsed: ParsedCsv, fileName: string): ParsedFile {
  const colMap = mapRegister(parsed.headers);
  const txs: CanonicalTx[] = [];

  for (const row of parsed.rows) {
    const vals = row.values;
    const modeVal = (vals[colMap.mode] ?? "").trim().toUpperCase();
    // Only include UPI register rows for reconciliation
    if (modeVal !== "UPI") continue;

    const appRaw = (vals[colMap.app] ?? "").trim().toUpperCase();
    let app: AppName;
    if (appRaw === "PHONEPE" || appRaw === "PHONE_PE") app = "phonepe";
    else if (appRaw === "GPAY" || appRaw === "GOOGLE_PAY" || appRaw === "GOOGLEPAY") app = "gpay";
    else if (appRaw === "PAYTM") app = "paytm";
    else continue; // skip unknown apps

    const utrFull = (vals[colMap.utrExpected] ?? "").trim();
    const amountPaise = rupeesToPaise(vals[colMap.amount] ?? "0");

    txs.push({
      app,
      kind: "register",
      utrFull,
      utrLast4: utrLast4(utrFull),
      amountPaise,
      timeISO: parseTimeToISO(vals[colMap.datetime] ?? ""),
      status: "sale",
      line: row.line,
      raw: row.raw,
      saleId: (vals[colMap.saleId] ?? "").trim(),
    });
  }

  return { app: "register", fileName, headers: parsed.headers, txs };
}

/**
 * Async wrapper that optionally uses LLM to map schema, falling back to heuristic.
 */
export async function normalizeWithAgent(
  fileText: string,
  app: AppName | "register",
  opts: { useLlm?: boolean; fileName: string },
): Promise<ParsedFile> {
  const { parseCsv } = await import("./csv");
  const parsed = parseCsv(fileText);

  // LLM path is a no-op for now (llm.mapSchema returns null on failure → fallback)
  if (opts.useLlm) {
    try {
      const llm = await import("./llm");
      if (llm.hasKey()) {
        const mapped = await llm.mapSchema(parsed.headers, app);
        if (mapped) {
          // LLM mapping succeeded — but for determinism we still use heuristic.
          // This is the hook point for future enhancement.
        }
      }
    } catch {
      // Fall through to heuristic
    }
  }

  if (app === "register") {
    return normalizeRegister(parsed, opts.fileName);
  }
  return normalizeStatement(parsed, app, opts.fileName);
}
