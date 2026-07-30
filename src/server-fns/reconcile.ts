import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ReconciliationResult } from "@/lib/engine/types";
import { reconcile } from "@/lib/engine/pipeline";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const reconcileInputSchema = z.object({
  phonepe: z.string().max(MAX_FILE_SIZE),
  gpay: z.string().max(MAX_FILE_SIZE),
  paytm: z.string().max(MAX_FILE_SIZE),
  register: z.string().max(MAX_FILE_SIZE),
});

export type ReconcileSuccess = ReconciliationResult;
export type ReconcileError = { error: string };
export type ReconcileResponse = ReconcileSuccess | ReconcileError;

/**
 * TanStack Start server function for file reconciliation.
 * Accepts four CSV file contents, runs the reconciliation pipeline,
 * and returns the result or an error object.
 */
export const reconcileFiles = createServerFn({ method: "POST" })
  .validator(reconcileInputSchema)
  .handler(async ({ data }): Promise<ReconcileResponse> => {
    try {
      const result = await reconcile({
        phonepe: data.phonepe,
        gpay: data.gpay,
        paytm: data.paytm,
        register: data.register,
      });
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown reconciliation error";
      return { error: message };
    }
  });
