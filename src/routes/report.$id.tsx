import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ReportView } from "@/components/hisaab/Workspace";
import { reconcileFiles } from "@/server-fns/reconcile";
import type { ReconciliationResult } from "@/lib/engine/types";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Hisaab reconciliation report" },
      {
        name: "description",
        content:
          "Read-only Hisaab reconciliation report: matched transactions, problems and missing money.",
      },
      { property: "og:title", content: "Hisaab reconciliation report" },
      {
        property: "og:description",
        content: "Shared read-only UPI reconciliation report.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

const SAMPLES = [
  "/samples/phonepe_july.csv",
  "/samples/gpay_july.csv",
  "/samples/paytm_july.csv",
  "/samples/register.csv",
];

function ReportPage() {
  const { id } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [result, setResult] = useState<ReconciliationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const texts = await Promise.all(SAMPLES.map(async (p) => (await fetch(p)).text()));
        const res = await reconcileFiles({
          data: {
            phonepe: texts[0],
            gpay: texts[1],
            paytm: texts[2],
            register: texts[3],
          },
        });
        if (cancelled) return;
        if ("error" in res) {
          setErrorMsg(res.error);
          setStatus("error");
          return;
        }
        setResult(res);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Failed to build the report");
        setStatus("error");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-shell p-3 sm:p-5">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-[28px] bg-background shadow-[0_24px_60px_-24px_oklch(0.4_0.12_300_/_0.45)]">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary">
            <span className="font-display text-[20px] leading-none font-bold text-primary-foreground">
              H
            </span>
          </div>
          <div>
            <h1 className="font-display text-[22px] leading-tight font-bold">Hisaab report</h1>
            <p className="label-caps text-muted-foreground">Read-only · {id}</p>
          </div>
          <Link
            to="/"
            className="ml-auto rounded-full bg-secondary px-4 py-2 text-[13px] font-semibold text-secondary-foreground"
          >
            Open workspace
          </Link>
        </header>
        <div className="p-4 sm:p-5">
          {status === "loading" && (
            <div className="space-y-4" aria-busy="true">
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          )}
          {status === "error" && (
            <div className="rounded-2xl bg-blossom/45 p-6 text-center">
              <p className="font-display text-[20px] font-bold">Report unavailable</p>
              <p className="mt-2 text-[14px] text-muted-foreground">{errorMsg}</p>
            </div>
          )}
          {status === "ready" && result && (
            <ReportView summary={result.summary} findings={result.findings} readOnly />
          )}
        </div>
      </div>
    </div>
  );
}
