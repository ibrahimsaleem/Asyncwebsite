import { useQuery } from "@tanstack/react-query";
import { formatMoney, sumByCurrency } from "@/lib/money";

// Every amount is shown in its billing currency with an approximate conversion to the other.
type Fx = { usdInr: number; asOf: string | null };

export function useFx() {
  const { data } = useQuery({
    queryKey: ["fx"],
    queryFn: async (): Promise<Fx> => {
      const res = await fetch("/api/fx", { credentials: "include" });
      if (!res.ok) throw new Error("fx");
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });
  return data?.usdInr ?? null;
}

function convert(value: number, from: string, to: string, usdInr: number) {
  if (from === to) return value;
  return from === "USD" ? value * usdInr : value / usdInr;
}

// "₹75,000" with "≈ $774" underneath (or inline)
export function Money({ value, currency = "USD", inline = false, className = "" }: {
  value: number | string; currency?: string | null; inline?: boolean; className?: string;
}) {
  const rate = useFx();
  const cur = currency ?? "USD";
  const n = parseFloat(String(value)) || 0;
  const other = cur === "INR" ? "USD" : "INR";
  const approx = rate ? `≈ ${formatMoney(Math.round(convert(n, cur, other, rate)), other)}` : null;
  return (
    <span className={`${inline ? "inline-flex items-baseline gap-1.5" : "inline-flex flex-col"} ${className}`}>
      <span className="whitespace-nowrap">{formatMoney(n, cur)}</span>
      {approx && n !== 0 && <span className="text-[0.7em] font-normal text-muted-foreground tabular-nums whitespace-nowrap">{approx}</span>}
    </span>
  );
}

// A total across invoices in different currencies, shown in both. "≈" marks converted figures.
export function DualTotal<T extends { currency?: string | null }>({ items, amount, className = "" }: {
  items: T[]; amount: (item: T) => number | string; className?: string;
}) {
  const rate = useFx();
  if (!rate) return <span className={className}>{sumByCurrency(items, amount)}</span>;
  const currencies = new Set(items.map((i) => i.currency ?? "USD"));
  const total = (to: string) => items.reduce((s, i) => s + convert(parseFloat(String(amount(i))) || 0, i.currency ?? "USD", to, rate), 0);
  const label = (to: string) => `${currencies.size === 1 && currencies.has(to) ? "" : "≈ "}${formatMoney(Math.round(total(to)), to)}`;
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="whitespace-nowrap">{label("INR")}</span>
      <span className="text-[0.55em] font-medium text-muted-foreground tabular-nums whitespace-nowrap">{label("USD")}</span>
    </span>
  );
}

export function FxNote() {
  const rate = useFx();
  if (!rate) return null;
  return <p className="text-[11px] text-muted-foreground">Conversions use $1 = ₹{rate.toFixed(2)} and are approximate. Invoices are billed in the currency shown first.</p>;
}
