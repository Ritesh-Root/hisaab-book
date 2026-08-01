# Hisaab (हिसाब) — every rupee matched, across every UPI app

A small Indian merchant takes payments on PhonePe, Google Pay and Paytm at once.
Every night they download a statement from each app, line them up against the
day's sales, and hunt by eye for the money that never arrived. Two hundred
transactions, one to two hours, and mistakes they will never catch.

Hisaab does the night's work in seconds: upload the three statements plus the
sales register, and it cross-checks every rupee, flags what is wrong, and tells
the merchant exactly what to do about each problem — with the evidence.

Built for the **ChatGPT Codex Hackathon 2026** · Track 6 — AI Agents for Bharat's
Businesses.

## The 90-second tour

1. Open the workspace → **Load sample statements** (or drop your own CSVs).
2. Statements parse — counts stamp in per app.
3. The matching sweep runs: 204 transactions stream by, flagged rows flash red.
   The counter reaches **₹4,200** in flagged transactions.
4. The report shows three problems, each with:
   - the exact amount and what happened,
   - a **verified** stamp — every claim was re-checked against the raw
     statement rows before it was allowed into the report,
   - the cited CSV rows (hover a card to see them),
   - the next action: *raise the dispute here, call this support line, watch
     tomorrow's statement*.
5. **Copy Report Link** → a read-only sample report page anyone can open.

## How it works

```
upload CSVs ──► parse ──► normalize (each app's format → one shape)
              ──► match (UTR + amount, then amount + time window)
              ──► classify (missing · unsettled · duplicate)
              ──► VERIFY — an independent gate re-checks every claim against
                  the cited raw rows. Claims it cannot prove are dropped,
                  never published.
              ──► bilingual report (English + हिंदी) with dispute steps
```

The verification gate is the heart of it. A reconciliation tool that invents a
discrepancy is worse than useless — it sends a merchant to fight a phantom
dispute. Nothing reaches the report unless the evidence rows literally contain
the claimed amount and UTR.

## What is real and what is mocked

**Real:** the entire pipeline. Upload any CSVs in these column formats and the
parse → match → verify → report flow genuinely runs, server-side, on your data.

**Sample data:** the four bundled statements (`public/samples/`) are
generated, because a live merchant's real statements sit behind bank APIs that
require licensed aggregator onboarding. Real merchants export exactly these
CSVs by hand today — Hisaab automates the matching, not the download. The
current share link replays the bundled sample report; uploaded files are
processed in memory and are not stored.
Wiring live statement pulls via an Account Aggregator is the roadmap item.

**Optional AI layer:** the repository contains a server-side enrichment hook for
finding narratives and unknown CSV formats. The deployed demo keeps that hook
off, so uploads stay on the deterministic path and the demo never depends on
an API being up. It can be enabled deliberately later with an `OPENAI_API_KEY`.

## Stack

TanStack Start (React 19, Vite, nitro) · Tailwind v4 · shadcn/ui · zod ·
vitest · Bun · deployed on Vercel.

## Run locally

```sh
git clone https://github.com/Ritesh-Root/hisaab-book.git
cd hisaab-book
bun install
bun run dev        # http://localhost:8080
bun run test       # engine tests
```

Optional: `cp .env.example .env` and add an OpenAI key for the enrichment layer.
