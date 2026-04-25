export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

export function formatCompactCurrency(value: number | null | undefined): string {
  const v = value ?? 0;
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  return `${(value ?? 0).toFixed(fractionDigits)}%`;
}

export function formatDelta(curr: number, prev: number): {
  pct: number;
  trend: "up" | "down" | "flat";
  label: string;
} {
  if (prev === 0) {
    if (curr === 0) return { pct: 0, trend: "flat", label: "—" };
    return { pct: 100, trend: curr > 0 ? "up" : "down", label: curr > 0 ? "+100%" : "-100%" };
  }
  const pct = ((curr - prev) / Math.abs(prev)) * 100;
  const trend: "up" | "down" | "flat" = pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  const sign = pct > 0 ? "+" : "";
  return { pct, trend, label: `${sign}${pct.toFixed(1)}%` };
}

export function formatRelativeTime(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "object" ? date : new Date(date);
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "agora";
  if (sec < 60) return `há ${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d2 = Math.round(h / 24);
  return `há ${d2}d`;
}
