import { createFileRoute } from "@tanstack/react-router";
import { Workspace } from "@/components/hisaab/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "हिसाब · Hisaab — UPI Reconciliation Workspace" },
      {
        name: "description",
        content:
          "Hisaab reconciles PhonePe, Google Pay and Paytm statements against your sales register and shows every missing rupee.",
      },
      { property: "og:title", content: "हिसाब · Hisaab — UPI Reconciliation Workspace" },
      {
        property: "og:description",
        content: "Match every rupee across PhonePe, GPay and Paytm in seconds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Workspace,
});
