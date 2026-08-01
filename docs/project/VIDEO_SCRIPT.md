# Hisaab demo video script

Target length: 2:45 to 2:55. Record with the hosted app signed out. Use the bundled
synthetic sample files only.

## 0:00–0:15 — The problem

**Show:** The Hisaab upload screen and the four CSV inputs.

**Say:**

> A small merchant can receive UPI payments through several apps, then spend
> the evening comparing separate statements with one sales register. The hard
> part is not just finding a mismatch. It is proving what happened without
> accusing the wrong payment.

## 0:15–0:30 — Start the real flow

**Show:** Click `Load sample` and let the ticker run.

**Say:**

> This is Hisaab. I am loading four CSV files: PhonePe, Google Pay, Paytm,
> and the register. The files are synthetic fixtures, but the parser and
> reconciliation path are real. No external API is needed for this run.

## 0:30–1:15 — Reconcile

**Show:** The transaction counter, provider counters, and final money-flagged
total.

**Say:**

> Hisaab parses each provider's format, maps the rows into one transaction
> shape, and matches them in two passes. It uses UTR and amount first, then a
> bounded time-and-amount fallback. This sample contains 204 transactions.
>
> The final total is 4,200 rupees in flagged transactions. That is flagged
> value, not a claim that all of the money is permanently lost.

## 1:15–1:55 — Open the findings

**Show:** Open each finding card.

**Say:**

> The first finding is 1,850 rupees missing from the register, with a UTR
> ending in 8842. The second is 1,500 rupees unsettled in Google Pay, ending
> in 2210. The third is an 850-rupee duplicate in Paytm, ending in 5517.

## 1:55–2:15 — Prove the evidence

**Show:** Click `View raw evidence` on each finding and show the verification stamps.

**Say:**

> Every finding points back to a source file and a one-based CSV line number.
> Before a finding is published, the verification gate checks that the cited
> raw row contains the amount and UTR needed to support the claim. If the row
> cannot prove it, the claim is dropped.

## 2:15–2:35 — Explain the build

**Show:** The repository README or architecture diagram, then the report page.

**Say:**

> The pipeline is parse, normalize, match, classify, verify, and report. The
> report page is read-only and replays the bundled sample. Uploaded files are
> processed in memory and are not stored.

## 2:35–2:48 — Show Codex usage

**Show:** The real GitHub history or terminal output for the hardening commit,
the 15-test run, and the security review. Do not fabricate a terminal replay.

**Say:**

> I used Codex for the final engineering and release loop: planning,
> edge-case tests, verification-gate hardening, the UI accuracy fix, the
> Vercel release, production smoke testing, and the static security review.
> The public repository shows that work. The initial visual scaffold came
> from Lovable, which I am disclosing separately.

## 2:48–2:55 — Close

**Show:** The public app URL, GitHub repository, and project document link.

**Say:**

> Hisaab turns a multi-app UPI reconciliation task into a short, evidence-
> backed review. The live app, public repository, and project description are
> linked with this submission.

Keep the final cut below three minutes. After uploading, open the video link
signed out and test it from another device.
