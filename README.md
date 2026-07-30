# Hisaab Book

Design spec — "bahi-khaata" (the red-cloth ledger)

  

  The app opens straight into the workspace — a merchant's nightly counter, not a marketing page. Top strip is the red cloth binding of a traditional ledger book, stitching included.

  

  Palette

  ┌───────────────────────────────────────────┬────────────────────────────────────────────────┬─────────┐

  │                   Role                    │                     Color                      │   Hex   │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Brand / binding strip / critical findings │ Cloth red                                      │ #8A1F19 │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Background — ledger paper                 │ Paper                                          │ #F8F4EC │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Surface (cards, table)                    │ Lighter paper                                  │ #FDFBF6 │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Matched / success stamps                  │ Hara green                                     │ #1D7A4F │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Warnings (unsettled)                      │ Marigold                                       │ #E8A020 │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ Text                                      │ Warm ink                                       │ #221B15 │

  ├───────────────────────────────────────────┼────────────────────────────────────────────────┼─────────┤

  │ App accents                               │ PhonePe #5F259F · GPay #0F9D58 · Paytm #00BAF2 │ —       │

  └───────────────────────────────────────────┴────────────────────────────────────────────────┴─────────┘

  Type (all Devanagari-capable, Google Fonts via next/font)

  - Display / wordmark / Hindi headlines — Baloo 2 (bold, Indian-native)

  - Body — Mukta

  - Numbers, UTRs, CSV evidence — JetBrains Mono, tabular, always Intl.NumberFormat('en-IN')

  - Contrast rule: missing-money total at 64–96px, section labels at 11px caps letter-spaced. Nothing in between except 14/16/20.

  

  Motion — rubber-stamp animations (✓ stamps land with slight rotation on match; red "असत्य" → green "सत्यापितstamp on verification), missing-₹ counter that counts up as findings confirm, live

  matching ticker, drop-zones glow in their app's brand color on drag-over, evidence drawers slide open on finding hover. Pipeline replay finishes in under 6 seconds.

  One page, four states: empty → uploading/parsing → matching (live ticker) → report. Left rail = uploads + pipeline stepper. Main area = ticker, then findings.

  ---

  The Codex prompt (copy everything inside)

  You are building the frontend of "Hisaab" (हिसाब— a UPI reconciliation agent for

  small Indian merchants. This task is FRONTEND ONLY against a mock data contract;

  the real matching engine arrives tomorrow and must require zero UI changes.

  ## Stack

  - Next.js 14 (App Router), TypeScript strict, Tailwind CSS, framer-motion.

  - Fonts via next/font/google: "Baloo 2" (display + Hindi), "Mukta" (body),

    "JetBrains Mono" (numbers/evidence). All three support Devanagari.

  - If AGENTS.md does not exist at repo root, create it: document this stack,

    `npm run dev` / `npm run build` commands, conventional-commit format,

    TypeScript strict, no `any`, and "amounts are always integer paise; format

    with Intl.NumberFormat('en-IN')".

  ## Design system (exact tokens — do not improvise)

  Colors: paper #F8F4EC (page bg), card #FDFBF6, ink #221B15 (text),

  cloth-red #8A1F19 (brand, critical), green #1D7A4F (matched/verified),

  marigold #E8A020 (warnings), phonepe #5F259F, gpay #0F9D58, paytm #00BAF2.

  No purple-to-pink gradients, no glassmorphism, no uniform rounded-2xl.

  Radii: 6px on cards, 4px on buttons, 999px only on stamps/badges.

  Layout: this is a WORKSPACE, not a landing page. No marketing hero, no

  feature cards, no footer links. Structure:

  1. Top binding strip (cloth-red, full width, 56px tall): wordmark "हिसाब"

     in Baloo 2 white on the left, tiny caps "UPI RECONCILIATION" below it,

     right side shows "आज काहिसा· {date} · {totalTx} transactions" once

     data loads. Bottom edge of the strip has a dashed 1px stitching line

     (dashed border-bottom, paper color, low opacity).

  2. Left rail (280px, card surface): three upload drop-zones stacked —

     "PhonePe Business", "Google Pay", "Paytm Business" — each with a small

     colored dot in its brand color and a dotted-border drop area. Below

     them: a vertical pipeline stepper with 4 stages (Parse → Match →

     Verify → Report); the active stage pulses, done stages get a green ✓.

  3. Main area: state-dependent (below).

  ## Four states (drive from a single `demoState` machine)

  - EMPTY: main area shows one large instruction in Baloo 2:

    "अपने तीनऐप के स्टेटमेंट डालिए+ English sub "Drop your three app

    statements and your sales register. Hisaab matches every rupee."

  - PARSING: each filled drop-zone flips to "✓ 82 transactions parsed" with

    a stamp-in animation (scale 1.4→1 + rotate -8°→0, 250ms).

  - MATCHING: main area becomes a live ticker — transaction rows stream in

    (~30/sec, mono, one line: time · app dot · ₹amount · UTR last 4) and

    each row gets a green ✓ stamp or a red flash. Above the ticker, the

    missing-money counter: starts at ₹0 in giant Baloo digits (72px),

    counts up to ₹4,200 as findings confirm. This stage must be fully

    deterministic and replay in ≤6 seconds from mock data.

  - REPORT: the findings view (below).

  ## Data contract (mock today, real tomorrow — build to these exact types)

  ```ts

  type AppName = 'phonepe' | 'gpay' | 'paytm';

  type Stage = 'parse' | 'match' | 'verify' | 'report';

  type UploadStatus = 'idle' | 'parsing' | 'parsed';

  interface Upload { app: AppName; status: UploadStatus; fileName?: string; txCount?: number; }

  interface TxRow { id: string; app: AppName; utrLast4: string; amountPaise: number; timeIST: string; kind: 'credit' | 'register'; }

  type FindingKind = 'missing' | 'unsettled' | 'duplicate';

  interface EvidenceRow { file: string; line: number; raw: string; }

  interface Finding {

    id: string; kind: FindingKind; amountPaise: number;

    titleHi: string; titleEn: string; detailHi: string; detailEn: string;

    action: string; verified: boolean; evidence: EvidenceRow[];

  }

  interface Summary { totalTx: number; matched: number; problems: number; missingPaise: number; }

  ```

  Seed the mock with this exact story: PhonePe 82 tx, GPay 74, Paytm 48

  (204 total, 201 matched). Findings, confirming in this order:

  1. missing ₹1,850 — sale #142, 6:47 PM, customer debited on PhonePe

     (UTR ...8842) but no credit in your statement. Action: "PhonePe

     Business app → this transaction → Raise dispute". Evidence:

     register.csv line 142; phonepe_july.csv (no match — show the two

     adjacent rows that DON'T match).

  2. unsettled ₹1,500 — GPay in-app credit pending 3 days, ref ...2210.

  - PARSING: each filled drop-zone flips to "✓ 82 transactions parsed" with

    a stamp-in animation (scale 1.4→1 + rotate -8°→0, 250ms).

  - MATCHING: main area becomes a live ticker — transaction rows stream in

    (~30/sec, mono, one line: time · app dot · ₹amount · UTR last 4) and

    each row gets a green ✓ stamp or a red flash. Above the ticker, the

    missing-money counter: starts at ₹0 in giant Baloo digits (72px),

    counts up to ₹4,200 as findings confirm. This stage must be fully

    deterministic and replay in ≤6 seconds from mock data.

  - REPORT: the findings view (below).

  ## Data contract (mock today, real tomorrow — build to these exact types)

  ```ts

  type AppName = 'phonepe' | 'gpay' | 'paytm';

  type Stage = 'parse' | 'match' | 'verify' | 'report';

  type UploadStatus = 'idle' | 'parsing' | 'parsed';

  interface Upload { app: AppName; status: UploadStatus; fileName?: string; txCount?: number; }

  interface TxRow { id: string; app: AppName; utrLast4: string; amountPaise: number; timeIST: string; kind: 'credit' | 'register'; }

  type FindingKind = 'missing' | 'unsettled' | 'duplicate';

  interface EvidenceRow { file: string; line: number; raw: string; }

  interface Finding {

    id: string; kind: FindingKind; amountPaise: number;

    titleHi: string; titleEn: string; detailHi: string; detailEn: string;

    action: string; verified: boolean; evidence: EvidenceRow[];

  }

  interface Summary { totalTx: number; matched: number; problems: number; missingPaise: number; }

  ```

  Seed the mock with this exact story: PhonePe 82 tx, GPay 74, Paytm 48

  (204 total, 201 matched). Findings, confirming in this order:

  1. missing ₹1,850 — sale #142, 6:47 PM, customer debited on PhonePe

     (UTR ...8842) but no credit in your statement. Action: "PhonePe

     Business app → this transaction → Raise dispute". Evidence:

     register.csv line 142; phonepe_july.csv (no match — show the two

     adjacent rows that DON'T match).

  2. unsettled ₹1,500 — GPay in-app credit pending 3 days, ref ...2210.

     Marigold styling, not red. Action: "GPay Business support".

  3. duplicate ₹850 — paytm.csv lines 47 and 51, same UTR ...5517,

     7:12 and 7:13 PM. Action: "No action — watch tomorrow's statement

     for reversal".

  ## Finding cards (report state)

  Left border 4px in severity color (red / marigold / red). Header row:

  amount in JetBrains Mono 24px + kind badge + language of titles Hindi

  primary, English smaller below. Body: 2-line explanation. Then a

  verification stamp: while unverified show a grey tilted outline stamp

  "जाँच हो रही है…"; 600ms later a green stamp slams in "सत्यापित ·

  verified against {file} line {n}". On hover/click the card expands an

  evidence drawer: mono, syntax-highlighted-ish rows from the raw CSV

  with the exact cited lines highlighted in pale green/red. Below each

  card: the action line prefixed "करनायह है →".

  Report footer summary strip: "204 में से 201 मेल खातेहैं · 3 समस्याएँ·

  ₹4,200 बकाया+ a Copy Report Link button (wire to a /report/[id]

  route stub that renders the same report read-only).

  ## Rules

  - No auth, no login, no settings, no extra pages beyond / and /report/[id].

  - All amounts integer paise; render via Intl.NumberFormat('en-IN').

  - All timers/matching fully deterministic — seeded mock, no Math.random

    in rendering paths.

  - Keyboard-focusable cards and drop-zones; aria-live on the counter.

  - Responsive down to 390px (rail collapses above main area) — judges

    review on phones.

  - Respect prefers-reduced-motion (disable stamp/ticker animations).

  ## Definition of done

  `npm run build` passes clean. One commit per component group,

  conventional messages (feat:, style:). Screenshot-worthy states:

  empty, matching (ticker mid-stream), full report with all three stamps

  verified. Deploy preview must open the EMPTY state at the root URL

  with no credentials.

  Two things while you run this: the types.ts in that prompt is the API contract — tomorrow's backend implements exactly those shapes, so frontend and engine meet without renegotiation. And

  when Codex produces it, send me screenshots — I'll do a design + correctness review pass before we move on.

  After this: want the AGENTS.md + seed-CSV specs (the three statement files with the ₹4,200 story baked in) for tonight's deploy?

althoght i mentione the colour and asthetic but dont use that i have attched a ui reference take hints from the image i have attche for the ui from the image i hust wanted you to copy the asthetic

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/056ab0af-08fb-4f33-abe9-e11cfa7cca89).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
