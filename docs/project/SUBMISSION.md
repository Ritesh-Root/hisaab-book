# Hisaab submission pack

Last checked: 2026-08-01 (Asia/Kolkata)

This file is the release ledger for the ChatGPT Codex Hackathon 2026 entry. It
keeps the public story, evidence, and final checks in one place.

## Event contract

| Requirement | Verified rule | Hisaab evidence | Status |
| --- | --- | --- | --- |
| Event | ChatGPT Codex Hackathon 2026, hosted by BlockseBlock | Event page and organizer guide | verified |
| Participant | Individual projects are allowed; the official FAQ says the maximum project size is one | Ritesh owns the submission | verified |
| Track | Choose one of nine tracks | Track 6: AI Agents for Bharat's Businesses | verified |
| Deadline | 3 August 2026 at 11:59 PM on the event page | Submit with a buffer on 3 August | verified |
| Deployed app | Public, working, active during evaluation, and no credentials required | `https://hisaab-book-umber.vercel.app` | ready |
| Repository | Public GitHub repository with visible commit history | `https://github.com/Ritesh-Root/hisaab-book` at `9b9c7ca` | ready |
| Demo video | Maximum three minutes; show the end-to-end product and Codex usage | Recorded product walkthrough | pending |
| Project document | Public Google Doc covering track, problem statement, and stack | [Draft created](https://docs.google.com/document/d/1R-uO7CiUAfX5ekcE5bAvptpf9rBGIHK9AcQosWMJj90/edit); public sharing still pending | pending |
| Viability gate | Deployed link opens, core flow runs, and repository matches the demo | Signed-out home and `/report/demo` smoke test passed | passed |
| Final action | BlockseBlock dashboard requires `Final Submit`; drafts do not count | Dashboard verification after submit | pending |

Primary sources:

- [Official event page](https://blockseblock.com/hackathon_details/chatgpt-codex-hackathon-2026)
- [Organizer-linked hackathon guide](https://docs.google.com/document/d/1sxdusoZMUEZduS2e0uXHCo5hv8rk-27O0fPzClYseyg/edit?tab=t.0#heading=h.rtfy2chl7r1v)
- [BlockseBlock dashboard](https://blockseblock.com/dashboard)

Live release:

- App: <https://hisaab-book-umber.vercel.app>
- Report: <https://hisaab-book-umber.vercel.app/report/demo>
- GitHub: <https://github.com/Ritesh-Root/hisaab-book>
- Release commit: `9b9c7ca`
- Project description draft: <https://docs.google.com/document/d/1R-uO7CiUAfX5ekcE5bAvptpf9rBGIHK9AcQosWMJj90/edit>

The guide lists this judging matrix:

| Criterion | Weight |
| --- | ---: |
| Technical execution | 50% |
| Impact and problem fit | 20% |
| Use of Codex | 15% |
| Creativity and originality | 10% |
| Completeness and demo quality | 5% |

## Submission fields

Use these values consistently in the dashboard, project document, README, and
video.

### Project name

Hisaab

### Track

AI Agents for Bharat's Businesses

### Short description

Hisaab helps a small Indian merchant reconcile PhonePe, Google Pay, and Paytm
statements against a sales register. It finds missing, pending, and duplicate
payments, then shows the CSV rows behind every finding.

### Project description

#### Problem

A small merchant who accepts UPI across several apps often downloads each
statement and compares it with the day's sales register by hand. With around
200 transactions, that can take an evening. A missed payment costs money, but a
wrong accusation is also harmful.

#### Solution

Hisaab accepts four CSV files: PhonePe, Google Pay, Paytm, and the sales
register. It parses each app's format, maps the rows to one internal shape,
matches payments by UTR and amount, and uses a time-window match for rows with
messy references. It then classifies missing, unsettled, and duplicate cases.

Before a finding reaches the report, a separate verification step checks the
cited raw CSV rows. If those rows do not literally support the claimed amount
and UTR, Hisaab drops the finding instead of publishing a guess.

The report gives the merchant English and Hindi text, the source file and line
number, the raw evidence row, and a next action.

#### Demo result

The bundled sample contains 204 transactions. Hisaab flags three cases worth
₹4,200 in total:

- ₹1,850 missing from the PhonePe statement, UTR ending in 8842
- ₹1,500 still pending in Google Pay, UTR ending in 2210
- ₹850 duplicated in the Paytm statement, UTR ending in 5517

The ₹4,200 figure is the total value of flagged cases. It is not a claim that
all of that money is permanently lost. The report separately identifies the
₹1,850 missing case.

#### Technology

React 19, TanStack Start, TypeScript, Vite, Nitro, Tailwind CSS, shadcn/ui,
Zod, Vitest, and Bun. The server function validates four inputs with a 2 MB cap
per file. The core reconciliation path is deterministic and does not need an
API key. An optional server-side OpenAI layer can improve finding narratives or
map unknown headers; the demo does not depend on it.

#### Codex usage

Codex is being used for the final engineering loop: repository inspection,
task planning, edge-case tests, UI accuracy fixes, release checks, and security
review. The demo should show a real Codex planning-to-verification pass and the
public repository should contain the resulting commits.

The initial visual scaffold came from Lovable. The submission must describe
that accurately. Do not claim that Codex created the earlier scaffold or that
the optional OpenAI layer is required for reconciliation.

#### Data and limitations

The bundled CSVs are synthetic seed data. Hisaab does not connect to bank APIs,
does not store uploaded files in a database, and does not claim Account
Aggregator access. Uploads are processed for the request and the current share
link replays the bundled sample report rather than persisting an arbitrary
uploaded report. The optional OpenAI enrichment hook stays off in the hosted
demo unless it is explicitly enabled and its data-sharing trade-off is tested.

## Three-minute video plan

The full spoken script is in [VIDEO_SCRIPT.md](./VIDEO_SCRIPT.md).

Target length: 2:45 to 2:55. Keep at least five seconds below the three-minute
limit.

| Time | Shot | Proof to show |
| --- | --- | --- |
| 0:00 to 0:15 | Open on the merchant problem | Four files, 200-plus transactions, manual checking |
| 0:15 to 0:30 | Load the sample statements | Real CSV files and parsed counts |
| 0:30 to 1:15 | Let the matching sweep run | 204 rows, flagged rows, money flagged reaching ₹4,200 |
| 1:15 to 1:55 | Open the three findings | ₹1,850 missing, ₹1,500 pending, ₹850 duplicate |
| 1:55 to 2:15 | Open raw evidence | File names, 1-based line numbers, raw rows, verified stamps |
| 2:15 to 2:35 | Show the architecture | Parse, normalize, match, classify, verify, report |
| 2:35 to 2:48 | Show Codex usage | Real planning, implementation, test, and review evidence |
| 2:48 to 2:55 | Close | Public app, GitHub repo, and project document links |

Recording rules:

- Use the sample data unless Ritesh explicitly approves real files.
- Show the real product flow. Do not narrate an unimplemented feature.
- Show the verification gate and the raw evidence rows. That is the clearest
  technical proof in the project.
- Keep the Codex segment factual. Show the actual session or commit/test
  evidence, not a fabricated terminal replay.
- Test the final video link signed out and from another device.

## Dashboard submission steps

The organizer guide says to complete these steps:

1. Open the [BlockseBlock dashboard](https://blockseblock.com/dashboard).
2. Open the hackathon and choose `Create Project`.
3. Enter `Hisaab`, select Track 6, and choose `Save & Next`.
4. Add the deployed app link, public GitHub link, demo video link, and public
   project-document link.
5. Choose `Submit Now`.
6. Toggle both acknowledgement notes and choose `Continue`.
7. Choose `Final Submit` only after every link has passed the signed-out check.
8. Open `My Projects` and confirm the status says `Submitted`.

The authenticated form may clarify whether the page also requires a separate
PPT upload. The public guide mentions "PPT + MVP" in the timeline but names a
Google Doc as the mandatory project document. Do not assume the two are the
same until the form is visible.

## Release checklist

### Local

- [x] `bun run test` passes: 16 tests
- [x] `NITRO_PRESET=vercel bun run build` passes
- [x] `bun run lint` has 0 errors
- [x] Add and push the Codex hardening commit (`1ef0816`)
- [x] Run the static security review and record residual risks in [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)
- [x] Review the release diff and confirm no `.env` or secret is tracked

### Public links

- [x] Push `main` to `origin` without rewriting history
- [x] Deploy the current build to Vercel or another approved host
- [x] Open `/` signed out and run the sample flow
- [x] Open `/report/demo` signed out and confirm the report renders
- [x] Confirm the deployed app does not expose `OPENAI_API_KEY`
- [x] Confirm the public GitHub history shows the final hardening work
- [x] Create the project-description Google Doc
- [ ] Set the Google Doc to "Anyone with the link can view"; the connected personal Gmail account cannot be changed to public through the available Drive sharing action
- [ ] Record and upload the video under three minutes

### Final form

- [ ] Project name and track match this file
- [ ] All four links open without credentials
- [ ] Video is under three minutes
- [ ] Project document contains track, problem, stack, real-vs-synthetic disclosure, and Codex usage
- [ ] Final Submit completed
- [ ] Dashboard status checked as `Submitted`
- [ ] Save a screenshot or PDF of the submitted confirmation

## Current risks

1. The public history contains the main build, but the Codex usage
   evidence is not yet strong enough. The hardening work and video must close
   that gap without rewriting history.
2. The share link is sample-only. Do not describe it as persistent storage for
   arbitrary merchant uploads.
3. The project-description draft exists, but its Google Drive permission is not
   public yet. Do not submit its link until a signed-out browser can open it.
4. The public rules do not state the video host, file type, or caption policy.
   Use a public video link unless the authenticated form says otherwise.
5. The public guide does not resolve whether a separate PPT is required. Check
   the authenticated form before final submission.
