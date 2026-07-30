import { describe, it, expect } from "vitest";
import { verifyCandidate } from "../verify";
import type { FindingCandidate } from "../findings";

describe("verifyCandidate", () => {
  it("passes a correct candidate with matching evidence", () => {
    const candidate: FindingCandidate = {
      kind: "missing",
      amountPaise: 185000,
      evidence: [
        { file: "register.csv", line: 142, raw: "142,2024-07-18 18:47,1850.00,UPI,PHONEPE,8842,customer screenshot success" },
        { file: "phonepe_july.csv", line: 96, raw: "PP100095,2024-07-18 18:44,620.00,CREDIT,SETTLED,4471" },
      ],
      ctx: { saleId: "142", app: "phonepe", utrLast4: "8842" },
    };

    const result = verifyCandidate(candidate);
    expect(result).not.toBeNull();
    expect(result?.verified).toBe(true);
  });

  it("drops a candidate with tampered amount in evidence", () => {
    const candidate: FindingCandidate = {
      kind: "missing",
      amountPaise: 185000, // claims ₹1850
      evidence: [
        { file: "register.csv", line: 142, raw: "142,2024-07-18 18:47,999.00,UPI,PHONEPE,8842,tampered" },
        { file: "phonepe_july.csv", line: 96, raw: "PP100095,2024-07-18 18:44,500.00,CREDIT,SETTLED,4471" },
      ],
      ctx: { saleId: "142", app: "phonepe", utrLast4: "8842" },
    };

    const result = verifyCandidate(candidate);
    expect(result).toBeNull();
  });

  it("drops a candidate citing wrong UTR (none of the evidence contains it)", () => {
    const candidate: FindingCandidate = {
      kind: "missing",
      amountPaise: 185000,
      evidence: [
        { file: "register.csv", line: 142, raw: "142,2024-07-18 18:47,1850.00,UPI,PHONEPE,9999,wrong utr" },
        { file: "phonepe_july.csv", line: 96, raw: "PP100095,2024-07-18 18:44,620.00,CREDIT,SETTLED,4471" },
      ],
      ctx: { saleId: "142", app: "phonepe", utrLast4: "8842" },
    };

    const result = verifyCandidate(candidate);
    expect(result).toBeNull();
  });

  it("passes when amount uses comma-formatted rupees", () => {
    const candidate: FindingCandidate = {
      kind: "unsettled",
      amountPaise: 150000,
      evidence: [
        { file: "gpay.csv", line: 58, raw: "2024-07-15 13:02,Name,vpa,CREDIT,1,500.00,PENDING,92210" },
        { file: "register.csv", line: 118, raw: "118,2024-07-15 13:02,1500.00,UPI,GPAY,92210," },
      ],
      ctx: { app: "gpay", utrLast4: "2210" },
    };

    const result = verifyCandidate(candidate);
    expect(result).not.toBeNull();
    expect(result?.verified).toBe(true);
  });
});
