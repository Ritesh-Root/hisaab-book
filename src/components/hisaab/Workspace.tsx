import { useEffect, useMemo, useRef, useState } from "react";
import { APP_DOT, APP_LABEL, formatPaise, formatPaisePlain } from "@/lib/hisaab/format";
import { FINDINGS, FLAG_AT, SUMMARY, TICKER_ROWS, TX_COUNTS, UPLOAD_SEED } from "@/lib/hisaab/mock";
import type { AppName, DemoState, Finding, Stage, Upload } from "@/lib/hisaab/types";

const STAGES: { key: Stage; hi: string; en: string }[] = [
  { key: "parse", hi: "Parse", en: "Read statements" },
  { key: "match", hi: "Match", en: "Cross-check" },
  { key: "verify", hi: "Verify", en: "Evidence" },
  { key: "report", hi: "Report", en: "Summary" },
];

const APPS: AppName[] = ["phonepe", "gpay", "paytm"];

function Dot({ app }: { app: AppName }) {
  return <span className={`inline-block size-2.5 rounded-full ${APP_DOT[app]}`} />;
}

/* ---------------------------------- rail --------------------------------- */

function DropZone({
  upload,
  onDrop,
}: {
  upload: Upload;
  onDrop: (app: AppName) => void;
}) {
  const [over, setOver] = useState(false);
  const parsed = upload.status === "parsed";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${APP_LABEL[upload.app]} statement`}
      onClick={() => onDrop(upload.app)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDrop(upload.app);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onDrop(upload.app);
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        over
          ? "border-lilac-deep bg-lilac/60 scale-[1.02]"
          : parsed
            ? "border-transparent bg-mint/50"
            : "border-border bg-muted hover:bg-lilac/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <Dot app={upload.app} />
        <span className="text-[13px] font-semibold">{APP_LABEL[upload.app]}</span>
      </div>
      {parsed ? (
        <div className="stamp-in mt-1.5 flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-full bg-success text-[11px] text-primary-foreground">
            ✓
          </span>
          <span className="font-mono text-[12px] text-success">
            {upload.txCount} transactions parsed
          </span>
        </div>
      ) : upload.status === "parsing" ? (
        <p className="pulse-soft mt-1.5 text-[12px] text-muted-foreground">Parsing…</p>
      ) : (
        <p className="mt-1.5 text-[12px] text-muted-foreground">Drop CSV / click to load</p>
      )}
    </div>
  );
}

function Stepper({ stage, done }: { stage: Stage; done: Stage[] }) {
  return (
    <ol className="mt-2 space-y-1">
      {STAGES.map((s) => {
        const isDone = done.includes(s.key);
        const active = s.key === stage && !isDone;
        return (
          <li key={s.key} className="flex items-center gap-3 py-1.5">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                isDone
                  ? "bg-success text-primary-foreground"
                  : active
                    ? "pulse-soft bg-lilac-deep text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {isDone ? "✓" : STAGES.indexOf(s) + 1}
            </span>
            <span className={`text-[13px] ${active || isDone ? "font-semibold" : "text-muted-foreground"}`}>
              {s.hi} <span className="text-[11px] text-muted-foreground">{s.en}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------- findings -------------------------------- */

const KIND_STYLE: Record<Finding["kind"], { chip: string; tile: string; label: string }> = {
  missing: { chip: "bg-danger/12 text-danger", tile: "bg-blossom/45", label: "missing" },
  unsettled: { chip: "bg-warning/20 text-[oklch(0.5_0.13_70)]", tile: "bg-apricot/45", label: "unsettled" },
  duplicate: { chip: "bg-lilac-deep/20 text-primary", tile: "bg-lilac/70", label: "duplicate" },
};

export function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [verified, setVerified] = useState(false);
  const [open, setOpen] = useState(false);
  const style = KIND_STYLE[finding.kind];
  const cite = finding.evidence[0];

  useEffect(() => {
    const t = setTimeout(() => setVerified(true), 600 + index * 350);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <article
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setOpen((v) => !v);
      }}
      className={`rounded-2xl p-4 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring ${style.tile}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[24px] font-semibold tabular-nums">
          {formatPaise(finding.amountPaise)}
        </span>
        <span className={`label-caps rounded-full px-2.5 py-1 ${style.chip}`}>{style.label}</span>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {cite.file}:{cite.line}
        </span>
      </div>

      <h3 className="mt-2 text-[20px] leading-tight font-semibold">{finding.titleEn}</h3>
      

      <p className="mt-2 text-[14px]">{finding.detailEn}</p>
      

      <div className="mt-3">
        {verified ? (
          <span className="stamp-in inline-flex items-center gap-2 rounded-full bg-success px-3 py-1.5 text-[12px] font-semibold text-primary-foreground">
            Verified against {cite.file} line {cite.line}
          </span>
        ) : (
          <span className="inline-flex -rotate-3 items-center rounded-full border border-dashed border-muted-foreground/60 px-3 py-1.5 text-[12px] text-muted-foreground">
            Verifying…
          </span>
        )}
      </div>

      {open && (
        <div className="row-in mt-3 overflow-hidden rounded-xl bg-card">
          {finding.evidence.map((row, i) => (
            <div
              key={`${row.file}-${row.line}`}
              className={`flex gap-3 px-3 py-1.5 font-mono text-[12px] ${
                i === 0
                  ? finding.kind === "missing"
                    ? "bg-danger/10"
                    : "bg-success/12"
                  : "text-muted-foreground"
              }`}
            >
              <span className="w-32 shrink-0 truncate opacity-70">{row.file}</span>
              <span className="w-8 shrink-0 opacity-70">{row.line}</span>
              <span className="truncate">{row.raw}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[14px] font-semibold">
        What to do → <span className="font-normal">{finding.action}</span>
      </p>
    </article>
  );
}

/* --------------------------------- report --------------------------------- */

export function ReportView({ readOnly = false }: { readOnly?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { hi: "Across three apps", en: "Total transactions", v: String(SUMMARY.totalTx), tile: "bg-lilac/70" },
          { hi: "Rupee-for-rupee", en: "Matched", v: String(SUMMARY.matched), tile: "bg-mint/70" },
          { hi: "Need your attention", en: "Problems", v: String(SUMMARY.problems), tile: "bg-apricot/60" },
        ].map((c) => (
          <div key={c.en} className={`rounded-2xl p-4 ${c.tile}`}>
            <p className="label-caps text-muted-foreground">{c.en}</p>
            <p className="font-mono text-[32px] leading-tight font-semibold tabular-nums">{c.v}</p>
            <p className="text-[13px]">{c.hi}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {FINDINGS.map((f, i) => (
          <FindingCard key={f.id} finding={f} index={i} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4">
        <p className="text-[16px]">
          201 of 204 transactions match · 3 problems ·{" "}
          <span className="font-mono font-semibold">{formatPaise(SUMMARY.missingPaise)}</span> outstanding
        </p>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/report/demo`;
              void navigator.clipboard?.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="ml-auto rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {copied ? "Link copied ✓" : "Copy Report Link"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- workspace -------------------------------- */

export function Workspace() {
  const [uploads, setUploads] = useState<Upload[]>(UPLOAD_SEED);
  const [state, setState] = useState<DemoState>("empty");
  const [visible, setVisible] = useState(0);
  const [missing, setMissing] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stage: Stage =
    state === "empty" || state === "parsing" ? "parse" : state === "matching" ? "match" : "report";
  const done: Stage[] =
    state === "report" ? ["parse", "match", "verify"] : state === "matching" ? ["parse"] : [];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const push = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  function loadOne(app: AppName) {
    setUploads((prev) =>
      prev.map((u) => (u.app === app ? { ...u, status: "parsing" } : u)),
    );
    setState("parsing");
    push(() => {
      setUploads((prev) =>
        prev.map((u) =>
          u.app === app
            ? { ...u, status: "parsed", fileName: `${app}_july.csv`, txCount: TX_COUNTS[app] }
            : u,
        ),
      );
    }, 450);
  }

  function runDemo() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(0);
    setMissing(0);
    setState("parsing");
    setUploads(UPLOAD_SEED.map((u) => ({ ...u, status: "parsing" })));
    APPS.forEach((app, i) => {
      push(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.app === app
              ? { ...u, status: "parsed", fileName: `${app}_july.csv`, txCount: TX_COUNTS[app] }
              : u,
          ),
        );
      }, 350 + i * 300);
    });
    push(() => setState("matching"), 1400);
  }

  // Deterministic ticker: 150 rows over ~3.6s, then report. Total ≤ 6s.
  useEffect(() => {
    if (state !== "matching") return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisible(i);
      if (i === 50) setMissing(185000);
      if (i === 100) setMissing(335000);
      if (i === 140) setMissing(420000);
      if (i >= TICKER_ROWS.length) {
        clearInterval(id);
        setTimeout(() => setState("report"), 500);
      }
    }, 24);
    return () => clearInterval(id);
  }, [state]);

  const rows = useMemo(() => TICKER_ROWS.slice(0, visible).slice(-14).reverse(), [visible]);
  const allParsed = uploads.every((u) => u.status === "parsed");

  return (
    <div className="min-h-screen bg-shell p-3 sm:p-5">
      <div className="mx-auto max-w-[1200px] overflow-hidden rounded-[28px] bg-background shadow-[0_24px_60px_-24px_oklch(0.4_0.12_300_/_0.45)]">
        {/* header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary">
            <span className="font-display text-[20px] leading-none font-bold text-primary-foreground">H</span>
          </div>
          <div>
            <h1 className="font-display text-[22px] leading-tight font-bold">Hisaab</h1>
            <p className="label-caps text-muted-foreground">UPI Reconciliation</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {allParsed && (
              <div className="rounded-full bg-lilac/70 px-4 py-2 text-[13px]">
                Today's books · 18 July 2024 ·{" "}
                <span className="font-mono font-semibold">{SUMMARY.totalTx}</span> transactions
              </div>
            )}
            <button
              type="button"
              onClick={runDemo}
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {state === "empty" ? "Run reconciliation" : "Replay"}
            </button>
          </div>
        </header>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[280px_1fr]">
          {/* rail */}
          <aside className="space-y-4 rounded-2xl bg-card p-4">
            <div>
              <p className="label-caps text-muted-foreground">Statements</p>
              <div className="mt-2 space-y-2">
                {uploads.map((u) => (
                  <DropZone key={u.app} upload={u} onDrop={loadOne} />
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="label-caps text-muted-foreground">Pipeline</p>
              <Stepper stage={stage} done={done} />
            </div>
          </aside>

          {/* main */}
          <main className="min-w-0">
            {state === "empty" && (
              <div className="grid min-h-[420px] place-items-center rounded-2xl bg-card p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-5 flex w-fit gap-2">
                    {APPS.map((a) => (
                      <span key={a} className={`size-3 rounded-full ${APP_DOT[a]}`} />
                    ))}
                  </div>
                  <h2 className="font-display text-[34px] leading-tight font-bold">
                    Drop your three app statements
                  </h2>
                  <p className="mt-3 text-[16px] text-muted-foreground">
                    Add your PhonePe, Google Pay and Paytm exports plus your sales register. Hisaab
                    matches every rupee.
                  </p>
                </div>
              </div>
            )}

            {state === "parsing" && (
              <div className="grid min-h-[420px] place-items-center rounded-2xl bg-card p-8 text-center">
                <div>
                  <h2 className="font-display text-[30px] font-bold">Reading your statements…</h2>
                  <p className="mt-2 text-[15px] text-muted-foreground">This takes a moment</p>
                  <div className="mt-6 flex justify-center gap-2">
                    {uploads.map((u) => (
                      <span
                        key={u.app}
                        className={`rounded-full px-3 py-1.5 font-mono text-[12px] ${
                          u.status === "parsed" ? "bg-mint/70 text-success" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {u.status === "parsed" ? `✓ ${u.txCount}` : "…"} {u.app}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state === "matching" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-lilac/70 p-5">
                  <p className="label-caps text-muted-foreground">Missing money found</p>
                  <p
                    aria-live="polite"
                    className="font-display text-[64px] leading-none font-bold tabular-nums sm:text-[72px]"
                  >
                    ₹{formatPaisePlain(missing)}
                  </p>
                  <p className="mt-1 text-[14px]">
                    <span className="font-mono">{visible}</span> / {TICKER_ROWS.length} rows matched
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-2">
                  {rows.map((r, i) => {
                    const idx = visible - 1 - i;
                    const flagged = FLAG_AT.includes(idx);
                    return (
                      <div
                        key={r.id}
                        className={`row-in flex items-center gap-3 rounded-xl px-3 py-1.5 font-mono text-[13px] ${
                          flagged ? "bg-danger/10" : ""
                        }`}
                      >
                        <span className="opacity-60">{r.timeIST}</span>
                        <Dot app={r.app} />
                        <span className="tabular-nums">{formatPaise(r.amountPaise)}</span>
                        <span className="opacity-60">UTR ···{r.utrLast4}</span>
                        <span className={`ml-auto ${flagged ? "text-danger" : "text-success"}`}>
                          {flagged ? "!" : "✓"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {state === "report" && <ReportView />}
          </main>
        </div>
      </div>
    </div>
  );
}
