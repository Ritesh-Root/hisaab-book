import type { EvidenceRow, Finding, FindingKind } from "@/lib/hisaab/types";
import type { MatchResult } from "./match";
import type { CanonicalTx } from "./types";

/**
 * A candidate finding before verification. Has all the data needed
 * to build the final Finding, but verified=false until the verify gate passes.
 */
export interface FindingCandidate {
  kind: FindingKind;
  amountPaise: number;
  evidence: EvidenceRow[];
  /** Extra context for template generation */
  ctx: {
    saleId?: string;
    app?: string;
    utrLast4?: string;
    timeISO?: string;
    creditLine?: number;
    creditFile?: string;
    dupLines?: number[];
    dupFile?: string;
  };
}

/**
 * Find the two temporally-nearest credit rows from a given app's statement
 * relative to a register row's time, to show the gap.
 */
function nearestCredits(
  registerTx: CanonicalTx,
  credits: CanonicalTx[],
  fileName: string,
): EvidenceRow[] {
  const rTime = new Date(registerTx.timeISO).getTime();
  const sorted = [...credits]
    .map((c) => ({ c, delta: Math.abs(new Date(c.timeISO).getTime() - rTime) }))
    .sort((a, b) => a.delta - b.delta);

  return sorted.slice(0, 2).map(({ c }) => ({
    file: fileName,
    line: c.line,
    raw: c.raw,
  }));
}

/**
 * Classify: missing — register row with mode UPI and non-empty utr_expected
 * that matched no credit.
 */
function classifyMissing(
  unmatchedRegister: CanonicalTx[],
  allCredits: Record<string, CanonicalTx[]>,
  fileNames: Record<string, string>,
): FindingCandidate[] {
  const candidates: FindingCandidate[] = [];

  for (const reg of unmatchedRegister) {
    // Only flag as missing if there's a non-empty UTR expected (customer-side success)
    if (!reg.utrFull || reg.utrFull.trim() === "") continue;

    const appCredits = allCredits[reg.app] ?? [];
    const appFileName = fileNames[reg.app] ?? `${reg.app}.csv`;

    const evidence: EvidenceRow[] = [
      { file: fileNames["register"] ?? "register.csv", line: reg.line, raw: reg.raw },
      ...nearestCredits(reg, appCredits, appFileName),
    ];

    candidates.push({
      kind: "missing",
      amountPaise: reg.amountPaise,
      evidence,
      ctx: {
        saleId: reg.saleId,
        app: reg.app,
        utrLast4: reg.utrLast4,
        timeISO: reg.timeISO,
      },
    });
  }

  return candidates;
}

/**
 * Classify: unsettled — a matched credit whose status === "pending".
 */
function classifyUnsettled(matched: MatchResult["matched"]): FindingCandidate[] {
  const candidates: FindingCandidate[] = [];

  for (const pair of matched) {
    if (pair.credit.status !== "pending") continue;

    candidates.push({
      kind: "unsettled",
      amountPaise: pair.credit.amountPaise,
      evidence: [
        { file: pair.credit.raw ? "" : "", line: pair.credit.line, raw: pair.credit.raw },
        { file: "", line: pair.register.line, raw: pair.register.raw },
      ],
      ctx: {
        app: pair.credit.app,
        utrLast4: pair.credit.utrLast4,
        timeISO: pair.credit.timeISO,
        creditLine: pair.credit.line,
        saleId: pair.register.saleId,
      },
    });
  }

  return candidates;
}

/**
 * Classify: duplicate — ≥2 credits sharing utrFull + amountPaise.
 */
function classifyDuplicate(
  allCredits: CanonicalTx[],
  registerTxs: CanonicalTx[],
  creditFileName: string,
  registerFileName: string,
): FindingCandidate[] {
  const candidates: FindingCandidate[] = [];
  const seen = new Map<string, CanonicalTx[]>();

  for (const c of allCredits) {
    const key = `${c.utrFull}:${c.amountPaise}`;
    const list = seen.get(key) ?? [];
    list.push(c);
    seen.set(key, list);
  }

  for (const [, group] of seen) {
    if (group.length < 2) continue;

    // Find the matching register row (if any)
    const sampleCredit = group[0];
    const regRow = registerTxs.find(
      (r) => r.utrLast4 === sampleCredit.utrLast4 && r.amountPaise === sampleCredit.amountPaise,
    );

    const evidence: EvidenceRow[] = [
      ...group.map((c) => ({
        file: creditFileName,
        line: c.line,
        raw: c.raw,
      })),
    ];
    if (regRow) {
      evidence.push({
        file: registerFileName,
        line: regRow.line,
        raw: regRow.raw,
      });
    }

    candidates.push({
      kind: "duplicate",
      amountPaise: sampleCredit.amountPaise,
      evidence,
      ctx: {
        app: sampleCredit.app,
        utrLast4: sampleCredit.utrLast4,
        dupLines: group.map((c) => c.line),
        dupFile: creditFileName,
      },
    });
  }

  return candidates;
}

/**
 * Run all classifiers and return candidate findings (unverified).
 */
export function classifyAll(
  matchResult: MatchResult,
  creditsByApp: Record<string, CanonicalTx[]>,
  allCredits: CanonicalTx[],
  registerTxs: CanonicalTx[],
  fileNames: Record<string, string>,
): FindingCandidate[] {
  const missing = classifyMissing(matchResult.unmatchedRegister, creditsByApp, fileNames);

  // Fix unsettled evidence file names (they were placeholder empty strings)
  const unsettled = classifyUnsettled(matchResult.matched).map((c) => {
    const app = c.ctx.app ?? "";
    c.evidence[0] = {
      file: fileNames[app] ?? `${app}.csv`,
      line: c.evidence[0].line,
      raw: c.evidence[0].raw,
    };
    c.evidence[1] = {
      file: fileNames["register"] ?? "register.csv",
      line: c.evidence[1].line,
      raw: c.evidence[1].raw,
    };
    return c;
  });

  const duplicate = classifyDuplicate(
    allCredits,
    registerTxs,
    fileNames["paytm"] ?? "paytm.csv",
    fileNames["register"] ?? "register.csv",
  );

  return [...missing, ...unsettled, ...duplicate];
}
