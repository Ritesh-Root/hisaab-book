import { createFileRoute, Link } from "@tanstack/react-router";
import { ReportView } from "@/components/hisaab/Workspace";

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Hisaab reconciliation report" },
      {
        name: "description",
        content: "Read-only Hisaab reconciliation report: matched transactions, problems and missing money.",
      },
      { property: "og:title", content: "Hisaab reconciliation report" },
      { property: "og:description", content: "Shared read-only UPI reconciliation report." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-shell p-3 sm:p-5">
      <div className="mx-auto max-w-[900px] overflow-hidden rounded-[28px] bg-background shadow-[0_24px_60px_-24px_oklch(0.4_0.12_300_/_0.45)]">
        <header className="flex items-center gap-3 border-b border-border bg-card px-5 py-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary">
            <span className="font-display text-[20px] leading-none font-bold text-primary-foreground">H</span>
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
          <ReportView readOnly />
        </div>
      </div>
    </div>
  );
}
