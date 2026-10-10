export type Currency = "INR" | "USD";

const FORMAT: Record<Currency, { symbol: string; locale: string }> = {
  INR: { symbol: "₹", locale: "en-IN" }, // ₹1,00,000
  USD: { symbol: "$", locale: "en-US" }, // $100,000
};

export function formatMoney(value: number | string, currency: string = "USD") {
  const n = typeof value === "number" ? value : parseFloat(String(value));
  const v = Number.isFinite(n) ? n : 0;
  const f = FORMAT[currency as Currency] ?? FORMAT.USD;
  // Whole amounts stay short (₹1,500); anything with paise/cents shows both digits
  const digits = Number.isInteger(v) ? 0 : 2;
  return `${f.symbol}${v.toLocaleString(f.locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

// Different currencies are never added together: "₹50,000 · $10,700"
export function sumByCurrency<T extends { currency?: string | null }>(items: T[], amount: (item: T) => number | string) {
  const totals = new Map<string, number>();
  for (const item of items) {
    const c = item.currency ?? "USD";
    totals.set(c, (totals.get(c) ?? 0) + (parseFloat(String(amount(item))) || 0));
  }
  if (totals.size === 0) return formatMoney(0, "INR");
  return [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([c, v]) => formatMoney(v, c)).join(" · ");
}
