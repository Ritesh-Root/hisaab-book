import type { Finding, FindingKind } from "@/lib/hisaab/types";
import type { FindingCandidate } from "./findings";

const APP_LABELS: Record<string, string> = {
  phonepe: "PhonePe",
  gpay: "GPay",
  paytm: "Paytm",
};

/**
 * Format ISO time to HH:MM in IST.
 */
function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Convert to IST string
  const istStr = d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return istStr;
}

/**
 * Format paise to rupee display string.
 */
function paiseToDisplay(paise: number): string {
  return `₹${(paise / 100).toFixed(0)}`;
}

/**
 * Build the action string for a finding.
 */
function buildAction(kind: FindingKind, app?: string): string {
  switch (kind) {
    case "missing":
      return `${APP_LABELS[app ?? "phonepe"] ?? app} Business app → this transaction → Raise dispute`;
    case "unsettled":
      return `${APP_LABELS[app ?? "gpay"] ?? app} Business support`;
    case "duplicate":
      return "No action: watch tomorrow's statement for reversal";
  }
}

/**
 * Generate bilingual Finding text from a verified candidate.
 * Pure function — no LLM, no external calls.
 */
export function buildFindingFromCandidate(
  candidate: FindingCandidate & { verified: true },
  index: number,
): Finding {
  const { kind, amountPaise, evidence, ctx } = candidate;
  const app = ctx.app ?? "";
  const utr = ctx.utrLast4 ?? "";
  const time = formatTime(ctx.timeISO ?? "");
  const amount = paiseToDisplay(amountPaise);

  let titleEn: string;
  let titleHi: string;
  let detailEn: string;
  let detailHi: string;

  switch (kind) {
    case "missing": {
      const saleLabel = ctx.saleId ? `sale #${ctx.saleId}` : "a sale";
      const saleLabelHi = ctx.saleId ? `बिक्री #${ctx.saleId}` : "एक बिक्री";
      titleEn = `Missing money: ${saleLabel}`;
      titleHi = `गायब पैसे: ${saleLabelHi}`;
      detailEn = `The register records a ${amount} ${APP_LABELS[app] ?? app} sale at ${time} (UTR ...${utr}), but no matching credit appears in the statement.`;
      detailHi = `रजिस्टर में ${time} पर ${amount} की ${APP_LABELS[app] ?? app} बिक्री दर्ज है (UTR ...${utr}), लेकिन स्टेटमेंट में मिलान वाला क्रेडिट नहीं मिला।`;
      break;
    }
    case "unsettled": {
      titleEn = `Unsettled credit: ${APP_LABELS[app] ?? app}`;
      titleHi = `बकाया निपटान — ${APP_LABELS[app] ?? app}`;
      detailEn = `${APP_LABELS[app] ?? app} in-app credit has been pending for several days, ref ...${utr}.`;
      detailHi = `${APP_LABELS[app] ?? app} का इन-ऐप क्रेडिट कई दिन से लंबित है, संदर्भ ...${utr}।`;
      break;
    }
    case "duplicate": {
      const lines = ctx.dupLines?.join(" and ") ?? "";
      titleEn = `Duplicate entry: ${APP_LABELS[app] ?? app}`;
      titleHi = `दोहरी प्रविष्टि — ${APP_LABELS[app] ?? app}`;
      detailEn = `${ctx.dupFile ?? "statement"} lines ${lines} carry the same UTR ...${utr} for ${amount}.`;
      detailHi = `${ctx.dupFile ?? "statement"} की लाइन ${lines} में एक ही UTR ...${utr}, ${amount} के लिए।`;
      break;
    }
  }

  return {
    id: `f${index + 1}`,
    kind,
    amountPaise,
    titleHi,
    titleEn,
    detailHi,
    detailEn,
    action: buildAction(kind, app),
    verified: true,
    evidence,
  };
}
