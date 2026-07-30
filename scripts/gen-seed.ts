#!/usr/bin/env bun
/**
 * Deterministic seed data generator for Hisaab reconciliation demo.
 *
 * Uses a seeded LCG (no Math.random) to produce four CSV files in public/samples/.
 * The files tell a specific story with exactly 3 findings:
 *   1. Missing: sale #142 (PhonePe, ₹1850, UTR *8842) — no matching credit
 *   2. Unsettled: GPay credit ₹1500, UTR *2210, PENDING
 *   3. Duplicate: Paytm credits ₹850, UTR *5517 (two entries)
 *
 * Running `bun scripts/gen-seed.ts` always produces identical files.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Seeded LCG ───────────────────────────────────────────────────
function createLcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const rnd = createLcg(20240718);

function rndInt(min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1));
}

function rndAmount(): number {
  return rndInt(25, 3200);
}

function rndUtr4(exclude: string[]): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const u = String(rndInt(1000, 9999));
    if (!exclude.includes(u)) return u;
  }
  throw new Error("Could not generate unique UTR");
}

// ─── Helpers ──────────────────────────────────────────────────────
function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fmtAmount(rupees: number): string {
  return rupees.toFixed(2);
}

const FIRST_NAMES = [
  "Amit",
  "Priya",
  "Ravi",
  "Sunita",
  "Vikram",
  "Anita",
  "Raj",
  "Meena",
  "Sanjay",
  "Pooja",
  "Arun",
  "Kavita",
  "Deepak",
  "Neha",
  "Manish",
  "Rekha",
  "Suresh",
  "Geeta",
  "Mukesh",
  "Lata",
  "Ajay",
  "Seema",
  "Ramesh",
  "Savita",
];

const VPA_SUFFIXES = [
  "@oksbi",
  "@okhdfcbank",
  "@okicici",
  "@okaxis",
  "@ybl",
  "@ibl",
  "@apl",
  "@paytm",
];

// ─── Reserved UTRs ────────────────────────────────────────────────
const RESERVED_UTRS = ["8842", "2210", "5517"];

// ─── Generate PhonePe statement ──────────────────────────────────
interface PhonePeRow {
  txnId: string;
  datetime: string;
  particulars: string;
  type: string;
  amount: number;
  status: string;
  utr: string;
}

function genPhonePe(): PhonePeRow[] {
  const rows: PhonePeRow[] = [];
  const usedUtrs: string[] = [...RESERVED_UTRS];

  // 82 credits, all SETTLED, spread over 2024-07-18 09:00–21:00
  for (let i = 0; i < 82; i++) {
    const hour = 9 + Math.floor((i / 82) * 12);
    const minute = rndInt(0, 59);
    const amount = rndAmount();
    const utr = rndUtr4(usedUtrs);
    usedUtrs.push(utr);

    // Avoid ₹1850 near 18:47 to prevent false pass-2 matches for sale 142
    let finalAmount = amount;
    if (finalAmount === 1850 && hour === 18 && minute >= 37 && minute <= 57) {
      finalAmount = rndAmount();
      if (finalAmount === 1850) finalAmount = 1851;
    }

    rows.push({
      txnId: `PP${String(100000 + i)}`,
      datetime: `2024-07-18 ${padTime(hour, minute)}`,
      particulars: `UPI/CR/${utr}/Customer`,
      type: "CREDIT",
      amount: finalAmount,
      status: "SETTLED",
      utr,
    });
  }

  return rows;
}

// ─── Generate GPay statement ─────────────────────────────────────
interface GpayRow {
  utcTimestamp: string;
  customerName: string;
  customerVpa: string;
  txnType: string;
  amount: number;
  status: string;
  utr: string;
}

function genGpay(): GpayRow[] {
  const rows: GpayRow[] = [];
  const usedUtrs: string[] = [...RESERVED_UTRS];

  // 74 credits: 73 settled + 1 pending (special)
  for (let i = 0; i < 74; i++) {
    // The special pending row at position 37 (roughly middle)
    if (i === 37) {
      rows.push({
        utcTimestamp: "2024-07-15 13:02",
        customerName: "Ramesh Kumar",
        customerVpa: "ramesh.k@oksbi",
        txnType: "CREDIT",
        amount: 1500,
        status: "PENDING",
        utr: "92210",
      });
      continue;
    }

    const day = rndInt(1, 28);
    const hour = rndInt(9, 20);
    const minute = rndInt(0, 59);
    const amount = rndAmount();
    const utr = rndUtr4(usedUtrs);
    usedUtrs.push(utr);
    const name = FIRST_NAMES[rndInt(0, FIRST_NAMES.length - 1)];
    const vpaSuffix = VPA_SUFFIXES[rndInt(0, VPA_SUFFIXES.length - 1)];

    rows.push({
      utcTimestamp: `2024-07-${String(day).padStart(2, "0")} ${padTime(hour, minute)}`,
      customerName: name,
      customerVpa: `${name.toLowerCase()}${vpaSuffix}`,
      txnType: "CREDIT",
      amount,
      status: "SETTLED",
      utr,
    });
  }

  return rows;
}

// ─── Generate Paytm statement ────────────────────────────────────
interface PaytmRow {
  orderId: string;
  txnId: string;
  receivedAt: string;
  amount: number;
  mode: string;
  status: string;
  utr: string;
}

function genPaytm(): PaytmRow[] {
  const rows: PaytmRow[] = [];
  const usedUtrs: string[] = [...RESERVED_UTRS];

  // 48 credits: 46 normal + 2 duplicate (special)
  for (let i = 0; i < 48; i++) {
    // First duplicate at position 23
    if (i === 23) {
      rows.push({
        orderId: `ORD${String(5000 + i)}`,
        txnId: `PT${String(200000 + i)}`,
        receivedAt: "2024-07-21 19:12",
        amount: 850,
        mode: "UPI",
        status: "SETTLED",
        utr: "75517",
      });
      continue;
    }
    // Second duplicate at position 24
    if (i === 24) {
      rows.push({
        orderId: `ORD${String(5000 + i)}`,
        txnId: `PT${String(200000 + i)}`,
        receivedAt: "2024-07-21 19:13",
        amount: 850,
        mode: "UPI",
        status: "SETTLED",
        utr: "75517",
      });
      continue;
    }

    const day = rndInt(1, 28);
    const hour = rndInt(9, 20);
    const minute = rndInt(0, 59);
    const amount = rndAmount();
    const utr = rndUtr4(usedUtrs);
    usedUtrs.push(utr);

    rows.push({
      orderId: `ORD${String(5000 + i)}`,
      txnId: `PT${String(200000 + i)}`,
      receivedAt: `2024-07-${String(day).padStart(2, "0")} ${padTime(hour, minute)}`,
      amount,
      mode: "UPI",
      status: "SETTLED",
      utr,
    });
  }

  return rows;
}

// ─── Generate Register ──────────────────────────────────────────
interface RegisterRow {
  saleId: number;
  datetime: string;
  amount: number;
  mode: string;
  app: string;
  utrExpected: string;
  note: string;
}

function genRegister(
  phonepeRows: PhonePeRow[],
  gpayRows: GpayRow[],
  paytmRows: PaytmRow[],
): RegisterRow[] {
  const rows: RegisterRow[] = [];

  // We need 204 register rows:
  // - 81 matching phonepe credits (skip 1 phonepe credit for the unmatched one)
  // - 74 matching gpay credits (including the pending one)
  // - 47 matching paytm credits (46 normal + 1 for the 5517 duplicate)
  // - 1 sale 142 (phonepe, ₹1850, UTR 8842, no matching credit) → MISSING
  // - 1 extra register row (paytm, empty UTR) → no finding

  let saleId = 1;

  // PhonePe register rows: 81 matching credits + sale 142
  // Skip the last phonepe credit (index 81) to leave it unmatched
  for (let i = 0; i < 81; i++) {
    const credit = phonepeRows[i];
    rows.push({
      saleId: saleId === 142 ? 143 : saleId, // skip 142 for now
      datetime: credit.datetime,
      amount: credit.amount,
      mode: "UPI",
      app: "PHONEPE",
      utrExpected: credit.utr,
      note: "",
    });
    saleId++;
    if (saleId === 142) saleId++; // skip 142
  }

  // Insert sale 142 at the right position (between phonepe rows)
  // Sale 142 should be at position ~142 in the final output
  // For now, we'll insert it after all phonepe rows and sort later

  // GPay register rows: all 74 (including the pending one)
  for (let i = 0; i < 74; i++) {
    const credit = gpayRows[i];
    rows.push({
      saleId: saleId === 142 ? 143 : saleId,
      datetime: credit.utcTimestamp,
      amount: credit.amount,
      mode: "UPI",
      app: "GPAY",
      utrExpected: credit.utr,
      note: "",
    });
    saleId++;
    if (saleId === 142) saleId++;
  }

  // Paytm register rows: 47 matching credits (skip one of the duplicates)
  // Skip index 24 (the second duplicate) so only one 5517 register row exists
  for (let i = 0; i < 48; i++) {
    if (i === 24) continue; // skip second duplicate
    const credit = paytmRows[i];
    rows.push({
      saleId: saleId === 142 ? 143 : saleId,
      datetime: credit.receivedAt,
      amount: credit.amount,
      mode: "UPI",
      app: "PAYTM",
      utrExpected: credit.utr,
      note: "",
    });
    saleId++;
    if (saleId === 142) saleId++;
  }

  // Sale 142: the MISSING finding
  rows.push({
    saleId: 142,
    datetime: "2024-07-18 18:47",
    amount: 1850,
    mode: "UPI",
    app: "PHONEPE",
    utrExpected: "8842",
    note: "customer screenshot success",
  });

  // Extra register row with empty UTR (won't trigger missing finding)
  rows.push({
    saleId: saleId,
    datetime: "2024-07-20 14:30",
    amount: 420,
    mode: "UPI",
    app: "PAYTM",
    utrExpected: "",
    note: "payment pending confirmation",
  });

  // Sort by sale_id to make sale 142 appear at the right position
  rows.sort((a, b) => a.saleId - b.saleId);

  return rows;
}

// ─── Write CSVs ──────────────────────────────────────────────────
function writePhonePeCsv(rows: PhonePeRow[]): string {
  const header = "txn_id,datetime,particulars,type,amount,status,utr";
  const lines = rows.map(
    (r) =>
      `${r.txnId},${r.datetime},${r.particulars},${r.type},${fmtAmount(r.amount)},${r.status},${r.utr}`,
  );
  return [header, ...lines].join("\n") + "\n";
}

function writeGpayCsv(rows: GpayRow[]): string {
  const header = "utc_timestamp,customer_name,customer_vpa,txn_type,amount,status,utr";
  const lines = rows.map(
    (r) =>
      `${r.utcTimestamp},${r.customerName},${r.customerVpa},${r.txnType},${fmtAmount(r.amount)},${r.status},${r.utr}`,
  );
  return [header, ...lines].join("\n") + "\n";
}

function writePaytmCsv(rows: PaytmRow[]): string {
  const header = "order_id,txn_id,received_at,amount,mode,status,utr";
  const lines = rows.map(
    (r) =>
      `${r.orderId},${r.txnId},${r.receivedAt},${fmtAmount(r.amount)},${r.mode},${r.status},${r.utr}`,
  );
  return [header, ...lines].join("\n") + "\n";
}

function writeRegisterCsv(rows: RegisterRow[]): string {
  const header = "sale_id,datetime,amount,mode,app,utr_expected,note";
  const lines = rows.map(
    (r) =>
      `${r.saleId},${r.datetime},${fmtAmount(r.amount)},${r.mode},${r.app},${r.utrExpected},${r.note}`,
  );
  return [header, ...lines].join("\n") + "\n";
}

// ─── Main ─────────────────────────────────────────────────────────
function main() {
  const outDir = join(import.meta.dir, "..", "public", "samples");
  mkdirSync(outDir, { recursive: true });

  const phonepeRows = genPhonePe();
  const gpayRows = genGpay();
  const paytmRows = genPaytm();
  const registerRows = genRegister(phonepeRows, gpayRows, paytmRows);

  const files = [
    { name: "phonepe_july.csv", content: writePhonePeCsv(phonepeRows) },
    { name: "gpay_july.csv", content: writeGpayCsv(gpayRows) },
    { name: "paytm_july.csv", content: writePaytmCsv(paytmRows) },
    { name: "register.csv", content: writeRegisterCsv(registerRows) },
  ];

  for (const f of files) {
    const path = join(outDir, f.name);
    writeFileSync(path, f.content);
    const lineCount = f.content.split("\n").filter((l) => l.trim()).length - 1;
    console.log(`  ${f.name}: ${lineCount} data rows`);
  }

  console.log(`\nSeed data written to ${outDir}`);
}

main();
