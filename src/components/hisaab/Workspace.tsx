import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { reconcileFiles } from "@/server-fns/reconcile";
import type { ReconciliationResult } from "@/lib/engine/types";
import { APP_DOT, APP_LABEL, formatPaise, formatPaisePlain } from "@/lib/hisaab/format";
import type {
  AppName,
  DemoState,
  Finding,
  Stage,
  Summary,
  Upload,
  UploadStatus,
} from "@/lib/hisaab/types";

const STAGES: { key: Stage; hi: string; en: string }[] = [
  { key: "parse", hi: "पढ़ें", en: "Read statements" },
  { key: "match", hi: "मिलान", en: "Cross-check" },
  { key: "verify", hi: "जाँच", en: "Evidence" },
  { key: "report", hi: "रिपोर्ट", en: "Summary" },
];

const APPS: AppName[] = ["phonepe", "gpay", "paytm"];

type FileKey = AppName | "register";
type FileInput = { text: string; fileName: string };

const SAMPLE_PATHS: Record<FileKey, string> = {
  phonepe: "/samples/phonepe_july.csv",
  gpay: "/samples/gpay_july.csv",
  paytm: "/samples/paytm_july.csv",
  register: "/samples/register.csv",
};

const SAMPLE_FILE_NAMES: Record<FileKey, string> = {
  phonepe: "phonepe_july.csv",
  gpay: "gpay_july.csv",
  paytm: "paytm_july.csv",
  register: "register.csv",
};

const UPLOAD_SEED: Upload[] = [
  { app: "phonepe", status: "idle" },
  { app: "gpay", status: "idle" },
  { app: "paytm", status: "idle" },
];

/** Quick client-side row count for the "parsed" stamp (header excluded). */
function countRows(text: string): number {
  const lines = text.trim().split(/\r?\n/);
  return Math.max(0, lines.length - 1);
}

function Dot({ app }: { app: AppName }) {
  return <span className={`inline-block size-2.5 rounded-full ${APP_DOT[app]}`} />;
}

/* ---------------------------------- rail --------------------------------- */

function DropZone({
  label,
  dot,
  status,
  txCount,
  fileName,
  hint,
  onFile,
}: {
  label: string;
  dot?: AppName;
  status: UploadStatus;
  txCount?: number;
  fileName?: string;
  hint: string;
  onFile: (text: string, fileName: string) => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = status === "parsed";

  async function accept(file: File | undefined | null) {
    if (!file) return;
    const text = await file.text();
    onFile(text, file.name);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Upload ${label}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
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
        void accept(e.dataTransfer.files?.[0]);
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-3 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        over
          ? "border-lilac-deep bg-lilac/60 scale-[1.02]"
          : parsed
            ? "border-transparent bg-mint/50"
            : "border-border bg-muted hover:bg-lilac/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          void accept(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-2">
        {dot && <Dot app={dot} />}
        <span className="text-[13px] font-semibold">{label}</span>
      </div>
      {parsed ? (
        <div className="stamp-in mt-1.5 flex items-center gap-1.5">
          <span className="grid size-5 place-items-center rounded-full bg-success text-[11px] text-primary-foreground">
            ✓
          </span>
          <span className="font-mono text-[12px] text-success">
            {fileName ? `${fileName} · ` : ""}
            {txCount ?? 0} transactions parsed
          </span>
        </div>
      ) : status === "parsing" ? (
        <p className="pulse-soft mt-1.5 text-[12px] text-muted-foreground">Parsing…</p>
      ) : (
        <p className="mt-1.5 text-[12px] text-muted-foreground">{hint}</p>
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
            <span
              className={`text-[13px] ${active || isDone ? "font-semibold" : "text-muted-foreground"}`}
            >
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
  unsettled: {
    chip: "bg-warning/20 text-[oklch(0.5_0.13_70)]",
    tile: "bg-apricot/45",
    label: "unsettled",
  },
  duplicate: { chip: "bg-lilac-deep/20 text-primary", tile: "bg-lilac/70", label: "duplicate" },
};

export function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const [verified, setVerified] = useState(false);
  const [open, setOpen] = useState(false);
  const style = KIND_STYLE[finding.kind];
  const cite = finding.evidence[0];
  const evidenceId = `evidence-${finding.id}`;

  useEffect(() => {
    const t = setTimeout(() => setVerified(true), 600 + index * 350);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <article className={`rounded-2xl p-4 ${style.tile}`}>
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
      <p className="text-[12px] text-muted-foreground">{finding.titleHi}</p>

      <p className="mt-2 text-[14px]">{finding.detailEn}</p>
      <p className="text-[13px] text-muted-foreground">{finding.detailHi}</p>

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

      <button
        type="button"
        aria-expanded={open}
        aria-controls={evidenceId}
        onClick={() => setOpen((v) => !v)}
        className="mt-3 rounded-full text-[13px] font-semibold text-primary underline decoration-primary/40 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? "Hide raw evidence ↑" : "View raw evidence ↓"}
      </button>

      {open && (
        <div
          id={evidenceId}
          role="region"
          aria-label={`Raw evidence for ${finding.titleEn}`}
          className="row-in mt-3 overflow-hidden rounded-xl bg-card"
        >
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

export function ReportView({
  summary,
  findings,
  readOnly = false,
}: {
  summary: Summary;
  findings: Finding[];
  readOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const flaggedPaise = findings.reduce((sum, finding) => sum + finding.amountPaise, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            hi: "तीनों ऐप्स से",
            en: "Total transactions",
            v: String(summary.totalTx),
            tile: "bg-lilac/70",
          },
          { hi: "मिलान हुआ", en: "Matched", v: String(summary.matched), tile: "bg-mint/70" },
          {
            hi: "ध्यान दें",
            en: "Problems",
            v: String(summary.problems),
            tile: "bg-apricot/60",
          },
          {
            hi: "लापता · लंबित · डुप्लिकेट",
            en: "Flagged value",
            v: formatPaise(flaggedPaise),
            tile: "bg-blossom/55",
          },
        ].map((c) => (
          <div key={c.en} className={`rounded-2xl p-4 ${c.tile}`}>
            <p className="label-caps text-muted-foreground">{c.en}</p>
            <p className="font-mono text-[30px] leading-tight font-semibold tabular-nums">{c.v}</p>
            <p className="text-[13px]">{c.hi}</p>
          </div>
        ))}
      </div>

      <p className="rounded-xl bg-card px-4 py-3 text-[14px] text-muted-foreground">
        Every finding below passed the evidence check. Open a card to inspect its raw CSV rows.
      </p>

      <div className="space-y-3">
        {findings.map((f, i) => (
          <FindingCard key={f.id} finding={f} index={i} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-card p-4">
        <p className="text-[16px]">
          {summary.matched} of {summary.totalTx} transactions match · {summary.problems} problems ·{" "}
          <span className="font-mono font-semibold">{formatPaise(flaggedPaise)}</span> flagged ·{" "}
          <span className="font-mono font-semibold">{formatPaise(summary.missingPaise)}</span>{" "}
          missing
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
            {copied ? "Sample link copied ✓" : "Copy sample report link"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- workspace -------------------------------- */

export function Workspace() {
  const [files, setFiles] = useState<Partial<Record<FileKey, FileInput>>>({});
  const [uploads, setUploads] = useState<Upload[]>(UPLOAD_SEED);
  const [registerStatus, setRegisterStatus] = useState<UploadStatus>("idle");
  const [registerCount, setRegisterCount] = useState<number>(0);
  const [registerFileName, setRegisterFileName] = useState<string>();
  const [state, setState] = useState<DemoState>("empty");
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [visible, setVisible] = useState(0);
  const [flaggedTotal, setFlaggedTotal] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stage: Stage =
    state === "empty" || state === "parsing" ? "parse" : state === "matching" ? "match" : "report";
  const done: Stage[] =
    state === "report" ? ["parse", "match", "verify"] : state === "matching" ? ["parse"] : [];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const push = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  function setFile(key: FileKey, text: string, fileName: string) {
    const resolvedFileName = fileName.trim() || SAMPLE_FILE_NAMES[key];
    setFiles((prev) => ({ ...prev, [key]: { text, fileName: resolvedFileName } }));
    if (key === "register") {
      setRegisterStatus("parsing");
      setRegisterFileName(resolvedFileName);
      push(() => {
        setRegisterStatus("parsed");
        setRegisterCount(countRows(text));
      }, 450);
    } else {
      setUploads((prev) => prev.map((u) => (u.app === key ? { ...u, status: "parsing" } : u)));
      push(() => {
        setUploads((prev) =>
          prev.map((u) =>
            u.app === key
              ? { ...u, status: "parsed", fileName: resolvedFileName, txCount: countRows(text) }
              : u,
          ),
        );
      }, 450);
    }
  }

  async function loadSampleTexts(keys: FileKey[]): Promise<Partial<Record<FileKey, FileInput>>> {
    const entries = await Promise.all(
      keys.map(
        async (k) =>
          [
            k,
            { text: await (await fetch(SAMPLE_PATHS[k])).text(), fileName: SAMPLE_FILE_NAMES[k] },
          ] as const,
      ),
    );
    return Object.fromEntries(entries) as Partial<Record<FileKey, FileInput>>;
  }

  async function startFlow() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVisible(0);
    setFlaggedTotal(0);

    // Resolve inputs: user files win; samples fill any gap.
    const haveApps = APPS.every((a) => Boolean(files[a]?.text));
    let inputs: Record<FileKey, FileInput>;
    if (haveApps && files.register?.text) {
      inputs = {
        phonepe: files.phonepe!,
        gpay: files.gpay!,
        paytm: files.paytm!,
        register: files.register!,
      };
    } else {
      const needed = [
        ...APPS.filter((a) => !files[a]?.text),
        ...(files.register?.text ? [] : ["register" as const]),
      ];
      const sampled = await loadSampleTexts(needed);
      const merged = { ...files, ...sampled } as Record<FileKey, FileInput>;
      setFiles(merged);
      inputs = merged;
    }

    // Staged "parsed" animation over the real texts.
    setState("parsing");
    APPS.forEach((app, i) => {
      const { text, fileName } = inputs[app];
      push(
        () => {
          setUploads((prev) =>
            prev.map((u) =>
              u.app === app ? { ...u, status: "parsed", fileName, txCount: countRows(text) } : u,
            ),
          );
        },
        350 + i * 300,
      );
    });
    push(
      () => {
        setRegisterStatus("parsed");
        setRegisterFileName(inputs.register.fileName);
        setRegisterCount(countRows(inputs.register.text));
      },
      350 + 3 * 300,
    );

    // Real reconciliation in parallel with the animation.
    try {
      const res = await reconcileFiles({
        data: {
          phonepe: inputs.phonepe.text,
          gpay: inputs.gpay.text,
          paytm: inputs.paytm.text,
          register: inputs.register.text,
          fileNames: {
            phonepe: inputs.phonepe.fileName,
            gpay: inputs.gpay.fileName,
            paytm: inputs.paytm.fileName,
            register: inputs.register.fileName,
          },
        },
      });
      if ("error" in res) {
        toast.error("Reconciliation failed", { description: res.error });
        setState("empty");
        return;
      }
      // Let the parse animation breathe, then run the ticker on real rows.
      push(() => {
        setResult(res);
        setState("matching");
      }, 1500);
    } catch (err) {
      toast.error("Reconciliation failed", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
      setState("empty");
    }
  }

  // Ticker replay over the REAL result: flags + flagged-money counter.
  const flagSet = useMemo(() => new Set(result?.flagUtrs ?? []), [result]);
  const counterPlan = useMemo(() => {
    // Amounts staged into the counter as their ticker rows appear;
    // entries whose UTR never appears (for example, a missing credit) land at the end.
    const byUtr = new Map<string, number>();
    let tail = 0;
    const flagUtrs = new Set(result?.flagUtrs ?? []);
    for (const f of result?.findings ?? []) {
      const utr = f.evidence
        .map((e) => e.raw)
        .join(" ")
        .match(/\b(\d{4})\b(?=[^\d]*$)/)?.[1];
      if (utr && flagUtrs.has(utr)) {
        byUtr.set(utr, (byUtr.get(utr) ?? 0) + f.amountPaise);
      } else {
        tail += f.amountPaise;
      }
    }
    return { byUtr, tail };
  }, [result]);

  useEffect(() => {
    if (state !== "matching" || !result) return;
    const rows = result.ticker;
    const consumed = new Set<string>();
    let i = 0;
    let acc = 0;
    const id = setInterval(() => {
      i += 1;
      setVisible(i);
      const row = rows[i - 1];
      if (row && flagSet.has(row.utrLast4) && !consumed.has(row.utrLast4)) {
        consumed.add(row.utrLast4);
        acc += counterPlan.byUtr.get(row.utrLast4) ?? 0;
        setFlaggedTotal(acc);
      }
      if (i >= rows.length) {
        clearInterval(id);
        setFlaggedTotal(acc + counterPlan.tail);
        setTimeout(() => setState("report"), 500);
      }
    }, 24);
    return () => clearInterval(id);
  }, [state, result, flagSet, counterPlan]);

  const rows = useMemo(
    () => (result ? result.ticker.slice(0, visible).slice(-14).reverse() : []),
    [result, visible],
  );
  const allParsed = uploads.every((u) => u.status === "parsed");
  const totalTx = result?.summary.totalTx ?? 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 flex-col">
        {/* header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary">
            <span className="font-display text-[20px] leading-none font-bold text-primary-foreground">
              H
            </span>
          </div>
          <div>
            <h1 className="font-display text-[22px] leading-tight font-bold">Hisaab</h1>
            <p className="label-caps text-muted-foreground">UPI Reconciliation</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {allParsed && (
              <div className="rounded-full bg-lilac/70 px-4 py-2 text-[13px]">
                Review ready · <span className="font-mono font-semibold">{totalTx || "—"}</span>{" "}
                transactions
              </div>
            )}
            <button
              type="button"
              onClick={() => void startFlow()}
              className="rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {state === "empty" ? "Load sample statements" : "Replay"}
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 p-4 sm:p-5 lg:grid-cols-[280px_1fr]">
          {/* rail */}
          <aside className="min-h-0 space-y-4 overflow-y-auto rounded-2xl bg-card p-4">
            <div>
              <p className="label-caps text-muted-foreground">Statements</p>
              <div className="mt-2 space-y-2">
                {uploads.map((u) => (
                  <DropZone
                    key={u.app}
                    label={APP_LABEL[u.app]}
                    dot={u.app}
                    status={u.status}
                    txCount={u.txCount}
                    fileName={u.fileName}
                    hint="Drop CSV / click to load"
                    onFile={(text, fileName) => setFile(u.app, text, fileName)}
                  />
                ))}
                <DropZone
                  label="Sales register"
                  status={registerStatus}
                  txCount={registerCount}
                  fileName={registerFileName}
                  hint="Optional. Sample used if empty."
                  onFile={(text, fileName) => setFile("register", text, fileName)}
                />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="label-caps text-muted-foreground">Pipeline</p>
              <Stepper stage={stage} done={done} />
            </div>
          </aside>

          {/* main */}
          <main className="min-w-0 min-h-0 overflow-y-auto">
            {state === "empty" && (
              <div className="grid h-full place-items-center rounded-2xl bg-card p-8 text-center">
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
                    checks payments against your register and flags exceptions.
                  </p>
                  <button
                    type="button"
                    onClick={() => void startFlow()}
                    className="mt-6 rounded-full bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Load sample statements
                  </button>
                </div>
              </div>
            )}

            {state === "parsing" && (
              <div className="grid h-full place-items-center rounded-2xl bg-card p-8 text-center">
                <div>
                  <h2 className="font-display text-[30px] font-bold">Reading your statements…</h2>
                  <p className="mt-2 text-[15px] text-muted-foreground">This takes a moment</p>
                  <div className="mt-6 flex justify-center gap-2">
                    {uploads.map((u) => (
                      <span
                        key={u.app}
                        className={`rounded-full px-3 py-1.5 font-mono text-[12px] ${
                          u.status === "parsed"
                            ? "bg-mint/70 text-success"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {u.status === "parsed" ? `✓ ${u.txCount}` : "…"} {u.app}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state === "matching" && result && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-lilac/70 p-5">
                  <p className="label-caps text-muted-foreground">Money flagged</p>
                  <p
                    aria-live="polite"
                    className="font-display text-[64px] leading-none font-bold tabular-nums sm:text-[72px]"
                  >
                    ₹{formatPaisePlain(flaggedTotal)}
                  </p>
                  <p className="mt-1 text-[14px]">
                    <span className="font-mono">{visible}</span> / {result.ticker.length} rows
                    checked
                  </p>
                </div>
                <div className="rounded-2xl bg-card p-2">
                  {rows.map((r, i) => {
                    const flagged = flagSet.has(r.utrLast4);
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

            {state === "matching" && !result && (
              <div className="grid h-full place-items-center rounded-2xl bg-card p-8">
                <p className="pulse-soft font-display text-[26px] font-bold">
                  Matching every rupee…
                </p>
              </div>
            )}

            {state === "report" && result && (
              <ReportView summary={result.summary} findings={result.findings} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
