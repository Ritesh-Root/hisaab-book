import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { reconcile } from "../pipeline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAMPLES_DIR = join(__dirname, "..", "..", "..", "..", "public", "samples");

function loadFile(name: string): string {
  return readFileSync(join(SAMPLES_DIR, name), "utf-8");
}

describe("reconcile pipeline", () => {
  it("produces exactly 3 findings from seed data", async () => {
    const inputs = {
      phonepe: loadFile("phonepe_july.csv"),
      gpay: loadFile("gpay_july.csv"),
      paytm: loadFile("paytm_july.csv"),
      register: loadFile("register.csv"),
    };

    const result = await reconcile(inputs);

    // Exactly 3 findings
    expect(result.findings).toHaveLength(3);

    // Order: missing, unsettled, duplicate
    expect(result.findings[0].kind).toBe("missing");
    expect(result.findings[1].kind).toBe("unsettled");
    expect(result.findings[2].kind).toBe("duplicate");

    // Amounts
    expect(result.findings[0].amountPaise).toBe(185000);
    expect(result.findings[1].amountPaise).toBe(150000);
    expect(result.findings[2].amountPaise).toBe(85000);

    // All verified
    expect(result.findings[0].verified).toBe(true);
    expect(result.findings[1].verified).toBe(true);
    expect(result.findings[2].verified).toBe(true);

    // Missing finding's evidence[0] is the register row for sale 142
    expect(result.findings[0].evidence[0].file).toBe("register.csv");
    expect(result.findings[0].evidence[0].raw).toContain("1850.00");
    expect(result.findings[0].evidence[0].raw).toContain("8842");

    // Duplicate finding's evidence contains both paytm rows
    const dupFinding = result.findings[2];
    const paytmEvidence = dupFinding.evidence.filter((e) => e.file === "paytm_july.csv");
    expect(paytmEvidence).toHaveLength(2);

    // Summary
    expect(result.summary.problems).toBe(3);

    // Ticker = all credits
    expect(result.ticker.length).toBe(204);

    // Parsed counts
    expect(result.parsedCounts.phonepe).toBe(82);
    expect(result.parsedCounts.gpay).toBe(74);
    expect(result.parsedCounts.paytm).toBe(48);
  });
});
