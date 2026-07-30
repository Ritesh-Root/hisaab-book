const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const inrPlain = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatPaise(paise: number): string {
  return inr.format(Math.round(paise / 100));
}

export function formatPaisePlain(paise: number): string {
  return inrPlain.format(Math.round(paise / 100));
}

export const APP_LABEL: Record<string, string> = {
  phonepe: "PhonePe Business",
  gpay: "Google Pay",
  paytm: "Paytm Business",
};

export const APP_DOT: Record<string, string> = {
  phonepe: "bg-phonepe",
  gpay: "bg-gpay",
  paytm: "bg-paytm",
};
