import type { CanonicalTx } from "./types";

export interface MatchPair {
  register: CanonicalTx;
  credit: CanonicalTx;
}

export interface MatchResult {
  matched: MatchPair[];
  unmatchedRegister: CanonicalTx[];
  unmatchedCredit: CanonicalTx[];
}

/**
 * Time window for fuzzy matching: 10 minutes in milliseconds.
 */
const TIME_WINDOW_MS = 10 * 60 * 1000;

/**
 * Parse an ISO time string to epoch ms. Returns 0 on failure.
 */
function timeMs(iso: string): number {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/**
 * Deterministic matching of register rows vs statement credits.
 *
 * Pass 1: exact key match on utrLast4 + ":" + amountPaise
 * Pass 2: amountPaise + |Δtime| ≤ 10 minutes
 * Each credit consumed at most once.
 */
export function matchTxs(
  register: CanonicalTx[],
  credits: CanonicalTx[],
): MatchResult {
  const matched: MatchPair[] = [];
  const usedCredits = new Set<number>();
  const usedRegister = new Set<number>();

  // Build credit index by composite key for pass 1
  const creditByKey = new Map<string, number[]>();
  for (let i = 0; i < credits.length; i++) {
    const c = credits[i];
    const key = `${c.utrLast4}:${c.amountPaise}`;
    const list = creditByKey.get(key) ?? [];
    list.push(i);
    creditByKey.set(key, list);
  }

  // Pass 1: exact UTR last-4 + amount match
  for (let ri = 0; ri < register.length; ri++) {
    const r = register[ri];
    const key = `${r.utrLast4}:${r.amountPaise}`;
    const candidates = creditByKey.get(key);
    if (!candidates) continue;

    for (const ci of candidates) {
      if (usedCredits.has(ci)) continue;
      usedCredits.add(ci);
      usedRegister.add(ri);
      matched.push({ register: r, credit: credits[ci] });
      break;
    }
  }

  // Pass 2: amount + time proximity for remaining unmatched register rows
  for (let ri = 0; ri < register.length; ri++) {
    if (usedRegister.has(ri)) continue;
    const r = register[ri];
    const rTime = timeMs(r.timeISO);

    let bestCi = -1;
    let bestDelta = Infinity;

    for (let ci = 0; ci < credits.length; ci++) {
      if (usedCredits.has(ci)) continue;
      const c = credits[ci];
      if (c.app !== r.app) continue;
      if (c.amountPaise !== r.amountPaise) continue;

      const cTime = timeMs(c.timeISO);
      const delta = Math.abs(rTime - cTime);
      if (delta <= TIME_WINDOW_MS && delta < bestDelta) {
        bestDelta = delta;
        bestCi = ci;
      }
    }

    if (bestCi >= 0) {
      usedCredits.add(bestCi);
      usedRegister.add(ri);
      matched.push({ register: r, credit: credits[bestCi] });
    }
  }

  const unmatchedRegister = register.filter((_, i) => !usedRegister.has(i));
  const unmatchedCredit = credits.filter((_, i) => !usedCredits.has(i));

  return { matched, unmatchedRegister, unmatchedCredit };
}
