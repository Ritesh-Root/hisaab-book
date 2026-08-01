# Static security review

Review date: 2026-08-01

Scope: current submission diff, server function boundary, optional OpenAI hook,
tracked files, generated client assets, and local Vercel metadata.

## Checks completed

| Check | Result |
| --- | --- |
| Tracked `.env`, key, PEM, credential, and secret-like files | No findings. `.env.example` is the only expected match. |
| Non-empty API key in local Vercel environment | None found. The value was not printed. |
| Vercel metadata and local env files | Ignored by `.gitignore`; neither is tracked. |
| Client bundle exposure | No `OPENAI_API_KEY`, OpenAI bearer header, or OpenAI API URL in `.output/public` or `.vercel/output/static`. |
| Server input boundary | `reconcileFiles` uses Zod, caps each of four CSV strings at 2 MB, and caps optional display names at 255 characters. |
| Cross-site server function requests | TanStack Start CSRF middleware is enabled for server functions. |
| Optional model credential boundary | The key is read only in `src/lib/engine/llm.ts`, which is included in the server output, not the public assets. |
| Persistence | No database, file-write path, browser storage, or upload storage was found in the application code. |
| Evidence integrity | The verification gate now requires amount and UTR to appear on the same cited raw row. |
| Test and build checks | 16 tests pass; Vercel-targeted build passes; lint has 0 errors. |
| Signed-out production smoke | Vercel home and `/report/demo` returned successfully; the sample flow produced 204 transactions, 201 matched, and 3 findings. |

Commands used included:

```sh
git ls-files | rg '(^|/)(\.env($|\.)|.*\.pem$|.*\.key$|credentials|secrets)'
rg -n -i 'sk-|BEGIN .*PRIVATE KEY|password|secret|api[_-]?key' .
rg -n 'OPENAI_API_KEY|api\.openai\.com|Authorization: `Bearer' .output .vercel/output
git check-ignore -v .env .env.example .vercel/.env.production.local .vercel/project.json
bun run test
NITRO_PRESET=vercel bun run build
bun run lint
```

## Not checked

- No production DAST, load test, or rate-limit test has run.
- Response-header and authenticated-flow audits have not run against production.
- `npm audit --omit=dev` could not run because the repository has no npm
  lockfile. `bun pm scan` could not run because no Bun security scanner is
  configured.
- The authenticated BlockseBlock submission form has not been inspected.

## Residual risk

1. The public reconciliation endpoint has input caps but no application-level
   rate limiting or abuse detection. That is acceptable for a short synthetic
   demo, not for an open financial service.
2. If the optional enrichment hook is enabled, raw evidence rows are sent to
   OpenAI. The hosted demo should keep it off unless the data-sharing choice is
   explicit and tested.
3. There is no authentication or tenant isolation. The app is stateless by
   design and should not be presented as a production system for confidential
   merchant records.
4. CSV size validation uses JavaScript string length rather than byte length.
   It is a practical cap for this demo but should become byte-aware before
   production use.
5. The report link replays synthetic sample data. It does not persist arbitrary
   uploaded files.

Security decision: acceptable for the public hackathon demo with synthetic
data, enrichment disabled, and the residual risks disclosed. Not production
ready for real merchant financial data without rate limiting, retention rules,
authentication, and a dependency audit.
