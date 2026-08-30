import type { PricePeriod } from "./types";

const MKD_EUR = 61.5;

export function eurOf(amount: number | null, currency: "EUR" | "MKD" | null): number | null {
  if (amount == null || !currency) return null;
  return currency === "MKD" ? amount / MKD_EUR : amount;
}

export function formatPrice(
  amount: number | null,
  currency: "EUR" | "MKD" | null,
  period: PricePeriod,
  lang: "mk" | "en",
): string {
  if (period === "negotiable" || amount == null) return lang === "mk" ? "по договор" : "negotiable";
  if (amount <= 1 && currency === "EUR") return lang === "mk" ? "по договор" : "negotiable";
  const unit = currency === "MKD" ? (lang === "mk" ? "МКД" : "MKD") : "€";
  const n =
    currency === "MKD"
      ? Math.round(amount).toLocaleString(lang === "mk" ? "mk-MK" : "en-US")
      : String(Math.round(amount));
  if (period === "total") return `${n} ${unit}`;
  const suf = period === "day" ? (lang === "mk" ? "/ден" : "/day") : lang === "mk" ? "/мес." : "/mo";
  return `${n} ${unit}${suf}`;
}
