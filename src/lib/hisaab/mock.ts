import type { AppName, Finding, Summary, TxRow, Upload } from "./types";

export const UPLOAD_SEED: Upload[] = [
  { app: "phonepe", status: "idle" },
  { app: "gpay", status: "idle" },
  { app: "paytm", status: "idle" },
];

export const TX_COUNTS: Record<AppName, number> = {
  phonepe: 82,
  gpay: 74,
  paytm: 48,
};

export const SUMMARY: Summary = {
  totalTx: 204,
  matched: 201,
  problems: 3,
  missingPaise: 420000,
};

export const FINDINGS: Finding[] = [
  {
    id: "f1",
    kind: "missing",
    amountPaise: 185000,
    titleHi: "गायब पैसा — बिक्री #142",
    titleEn: "Missing money — sale #142",
    detailHi:
      "ग्राहक ने PhonePe से 6:47 PM पर भुगतान किया (UTR ...8842), पर आपके स्टेटमेंट में यह क्रेडिट नहीं आया।",
    detailEn:
      "Customer was debited on PhonePe at 6:47 PM (UTR ...8842) but no matching credit appears in your statement.",
    action: "PhonePe Business app → this transaction → Raise dispute",
    verified: false,
    evidence: [
      { file: "register.csv", line: 142, raw: "142,2024-07-18 18:47,1850.00,UPI,PHONEPE,...8842,SALE" },
      { file: "phonepe_july.csv", line: 96, raw: "96,2024-07-18 18:44,  620.00,CREDIT,...4471,SETTLED" },
      { file: "phonepe_july.csv", line: 97, raw: "97,2024-07-18 18:51,  305.00,CREDIT,...9013,SETTLED" },
    ],
  },
  {
    id: "f2",
    kind: "unsettled",
    amountPaise: 150000,
    titleHi: "बकाया निपटान — GPay",
    titleEn: "Unsettled credit — GPay",
    detailHi: "GPay का इन-ऐप क्रेडिट 3 दिन से लंबित है, संदर्भ ...2210।",
    detailEn: "GPay in-app credit has been pending for 3 days, ref ...2210.",
    action: "GPay Business support",
    verified: false,
    evidence: [
      { file: "gpay_july.csv", line: 58, raw: "58,2024-07-15 13:02, 1500.00,CREDIT,...2210,PENDING" },
      { file: "register.csv", line: 118, raw: "118,2024-07-15 13:02,1500.00,UPI,GPAY,...2210,SALE" },
    ],
  },
  {
    id: "f3",
    kind: "duplicate",
    amountPaise: 85000,
    titleHi: "दोहरी प्रविष्टि — Paytm",
    titleEn: "Duplicate entry — Paytm",
    detailHi: "paytm.csv की लाइन 47 और 51 में एक ही UTR ...5517, 7:12 और 7:13 PM पर।",
    detailEn: "paytm.csv lines 47 and 51 carry the same UTR ...5517 at 7:12 and 7:13 PM.",
    action: "No action — watch tomorrow's statement for reversal",
    verified: false,
    evidence: [
      { file: "paytm.csv", line: 47, raw: "47,2024-07-21 19:12,  850.00,CREDIT,...5517,SETTLED" },
      { file: "paytm.csv", line: 51, raw: "51,2024-07-21 19:13,  850.00,CREDIT,...5517,SETTLED" },
    ],
  },
];

const APPS: AppName[] = ["phonepe", "gpay", "paytm"];

// Deterministic pseudo-random: no Math.random in render paths.
function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export const TICKER_ROWS: TxRow[] = (() => {
  const rnd = lcg(20240718);
  const rows: TxRow[] = [];
  for (let i = 0; i < 150; i += 1) {
    const app = APPS[Math.floor(rnd() * 3)];
    const hour = 9 + Math.floor(rnd() * 12);
    const minute = Math.floor(rnd() * 60);
    const amount = (25 + Math.floor(rnd() * 3200)) * 100;
    const utr = String(1000 + Math.floor(rnd() * 8999));
    rows.push({
      id: `t${i}`,
      app,
      utrLast4: utr,
      amountPaise: amount,
      timeIST: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      kind: "credit",
    });
  }
  return rows;
})();

// Deterministic indices where the ticker flags a problem.
export const FLAG_AT = [42, 88, 126];
