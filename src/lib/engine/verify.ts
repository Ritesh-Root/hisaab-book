import type { EvidenceRow } from "@/lib/hisaab/types";
import type { FindingCandidate } from "./findings";

/**
 * Normalize a rupee amount string for comparison.
 * Strips commas, whitespace, and the ₹ symbol.
 */
function normalizeAmount(raw: string): string {
  return raw.replace(/[,\s₹]/g, "");
}

/**
 * Convert paise to the rupee string as it would appear in a CSV.
 * e.g., 185000 paise → "1850.00"
 */
function paiseToRupeeStr(paise: number): string {
  const rupees = paise / 100;
  return rupees.toFixed(2);
}

/**
 * Check whether a raw evidence line contains the claimed amount.
 * Handles both "1850.00" and "1,850.00" forms.
 */
function evidenceContainsAmount(raw: string, amountPaise: number): boolean {
  const normalized = normalizeAmount(raw);
  const target = paiseToRupeeStr(amountPaise);
  // Also check the integer-rupee form (e.g., "1850" if .00)
  const targetInt = String(amountPaise / 100);
  return normalized.includes(target) || normalized.includes(targetInt);
}

/**
 * Check whether a raw evidence line contains the claimed UTR last-4.
 */
function evidenceContainsUtr(raw: string, utrLast4: string): boolean {
  if (!utrLast4 || utrLast4.length < 4) return true; // no UTR to check
  return raw.includes(utrLast4);
}

/**
 * Verify a candidate finding: at least one evidence row must contain the claimed
 * amount, and if a UTR last-4 is claimed, at least one row must contain it.
 *
 * This is the GATE — candidates failing this check are DROPPED, never published.
 * Returns the candidate with verified=true if it passes, or null if it fails.
 */
export function verifyCandidate(
  candidate: FindingCandidate,
): (FindingCandidate & { verified: true }) | null {
  const amountOk = candidate.evidence.some((e) =>
    evidenceContainsAmount(e.raw, candidate.amountPaise),
  );

  const utrOk =
    !candidate.ctx.utrLast4 ||
    candidate.evidence.some((e) => evidenceContainsUtr(e.raw, candidate.ctx.utrLast4 ?? ""));

  if (amountOk && utrOk) {
    return { ...candidate, verified: true };
  }
  return null;
}

/**
 * Run verification on all candidates, dropping any that fail.
 */
export function verifyAll(
  candidates: FindingCandidate[],
): (FindingCandidate & { verified: true })[] {
  const survivors: (FindingCandidate & { verified: true })[] = [];
  for (const c of candidates) {
    const verified = verifyCandidate(c);
    if (verified) survivors.push(verified);
  }
  return survivors;
}
