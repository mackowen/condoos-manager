// Convert numeric/date fields from Drizzle row to plain JSON-friendly shape
export function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (typeof v === "bigint") return Number(v);
  return 0;
}

export function nNullable(v: unknown): number | null {
  if (v == null) return null;
  return n(v);
}

export function iso(v: unknown): string {
  if (v == null) return new Date(0).toISOString();
  if (v instanceof Date) return v.toISOString();
  return new Date(v as string).toISOString();
}

export function isoNullable(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return new Date(v as string).toISOString();
}

export function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}
