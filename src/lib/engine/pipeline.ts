import type { AppName, Summary, TxRow } from "@/lib/hisaab/types";
import { parseCsv } from "./csv";
import { classifyAll } from "./findings";
import * as llm from "./llm";
import { matchTxs } from "./match";
import { normalizeRegister, normalizeStatement } from "./normalize";
import { buildFindingFromCandidate } from "./templates";
import type { CanonicalTx, ReconciliationResult } from "./types";
import { verifyAll } from "./verify";

export interface ReconcileInputs {
  phonepe: string;
  gpay: string;
  paytm: string;
  register: string;
}

export interface ReconcileOpts {
  useLlm?: boolean;
  enrich?: boolean;
}

/**
 * Parse IST time from ISO string into "HH:MM" format for the ticker.
 */
function isoToTimeIST(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "00:00";
  const h = d.getUTCHours() + 5; // IST = UTC+5:30
  const m = d.getUTCMinutes() + 30;
  const adjH = (h + Math.floor(m / 60)) % 24;
  const adjM = m % 60;
  return `${String(adjH).padStart(2, "0")}:${String(adjM).padStart(2, "0")}`;
}

/**
 * Main reconciliation pipeline.
 *
 * Steps: parse all four → normalize → match → classify → verify →
 * build Summary → build ticker → optional LLM enrichment.
 *
 * Deterministic: with no env keys set, produces the full correct result
 * with ZERO external calls.
 */
export async function reconcile(
  inputs: ReconcileInputs,
  opts?: ReconcileOpts,
): Promise<ReconciliationResult> {
  // ─── 1. Parse ──────────────────────────────────────────────────────
  const phonepeParsed = parseCsv(inputs.phonepe);
  const gpayParsed = parseCsv(inputs.gpay);
  const paytmParsed = parseCsv(inputs.paytm);
  const registerParsed = parseCsv(inputs.register);

  // ─── 2. Normalize ─────────────────────────────────────────────────
  const phonepeFile = normalizeStatement(phonepeParsed, "phonepe", "phonepe_july.csv");
  const gpayFile = normalizeStatement(gpayParsed, "gpay", "gpay_july.csv");
  const paytmFile = normalizeStatement(paytmParsed, "paytm", "paytm_july.csv");
  const registerFile = normalizeRegister(registerParsed, "register.csv");

  const fileNames: Record<string, string> = {
    phonepe: phonepeFile.fileName,
    gpay: gpayFile.fileName,
    paytm: paytmFile.fileName,
    register: registerFile.fileName,
  };

  // All credits across all statements
  const allCredits: CanonicalTx[] = [
    ...phonepeFile.txs,
    ...gpayFile.txs,
    ...paytmFile.txs,
  ];

  const creditsByApp: Record<string, CanonicalTx[]> = {
    phonepe: phonepeFile.txs,
    gpay: gpayFile.txs,
    paytm: paytmFile.txs,
  };

  // ─── 3. Match ─────────────────────────────────────────────────────
  const matchResult = matchTxs(registerFile.txs, allCredits);

  // ─── 4. Classify ──────────────────────────────────────────────────
  const candidates = classifyAll(
    matchResult,
    creditsByApp,
    allCredits,
    registerFile.txs,
    fileNames,
  );

  // ─── 5. Verify ────────────────────────────────────────────────────
  const verified = verifyAll(candidates);

  // ─── 6. Build findings with template text ─────────────────────────
  // Sort by kind priority: missing, unsettled, duplicate — stable
  const kindOrder: Record<string, number> = { missing: 0, unsettled: 1, duplicate: 2 };
  const sorted = [...verified].sort((a, b) => {
    const ka = kindOrder[a.kind] ?? 9;
    const kb = kindOrder[b.kind] ?? 9;
    if (ka !== kb) return ka - kb;
    return a.amountPaise - b.amountPaise;
  });

  const findings = sorted.map((c, i) => buildFindingFromCandidate(c, i));

  // ─── 7. Optional LLM enrichment ───────────────────────────────────
  if (opts?.enrich && llm.hasKey()) {
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      const enriched = await llm.enrichFinding(
        { kind: f.kind, amountPaise: f.amountPaise, titleEn: f.titleEn },
        f.evidence,
      );
      if (enriched) {
        if (enriched.titleEn) f.titleEn = enriched.titleEn;
        if (enriched.titleHi) f.titleHi = enriched.titleHi;
        if (enriched.detailEn) f.detailEn = enriched.detailEn;
        if (enriched.detailHi) f.detailHi = enriched.detailHi;
      }
    }
  }

  // ─── 8. Build summary ─────────────────────────────────────────────
  const totalTx = allCredits.length;
  const matchedSettled = matchResult.matched.filter(
    (m) => m.credit.status === "settled",
  ).length;
  const missingPaise = findings
    .filter((f) => f.kind === "missing" && f.verified)
    .reduce((sum, f) => sum + f.amountPaise, 0);

  const summary: Summary = {
    totalTx,
    matched: matchedSettled,
    problems: findings.length,
    missingPaise,
  };

  // ─── 9. Build ticker ──────────────────────────────────────────────
  const tickerCredits = [...allCredits].sort((a, b) => {
    const ta = new Date(a.timeISO).getTime();
    const tb = new Date(b.timeISO).getTime();
    return ta - tb;
  });

  const ticker: TxRow[] = tickerCredits.map((c, i) => ({
    id: `t${i}`,
    app: c.app,
    utrLast4: c.utrLast4,
    amountPaise: c.amountPaise,
    timeIST: isoToTimeIST(c.timeISO),
    kind: "credit" as const,
  }));

  // ─── 10. Parsed counts ────────────────────────────────────────────
  const parsedCounts: Record<AppName, number> = {
    phonepe: phonepeFile.txs.length,
    gpay: gpayFile.txs.length,
    paytm: paytmFile.txs.length,
  };

  return {
    summary,
    findings,
    ticker,
    parsedCounts,
    registerCount: registerFile.txs.length,
  };
}
