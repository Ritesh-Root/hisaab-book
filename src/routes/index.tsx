import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/hisaab/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hisaab — UPI Reconciliation Workspace" },
      {
        name: "description",
        content:
          "Hisaab reconciles PhonePe, Google Pay and Paytm statements against your sales register and shows the raw rows behind every finding.",
      },
      { property: "og:title", content: "Hisaab — UPI Reconciliation Workspace" },
      {
        property: "og:description",
        content:
          "Find missing, unsettled, and duplicate UPI payments across PhonePe, Google Pay, and Paytm.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});
