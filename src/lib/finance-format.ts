const MONTH_LABELS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

const MONTH_LABELS_FULL = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

/** Formats a Date using the browser's local calendar date, as "YYYY-MM-DD" (no UTC shift). */
export function toISODateString(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

/** Parses a "YYYY-MM-DD" string into a local-midnight Date, safe for display/date-pickers. */
export function parseISODateToLocalDate(value: string): Date {
  const parts = value.slice(0, 10).split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  return new Date(year, month - 1, day);
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatShortDate(value: string): string {
  const date = parseISODateToLocalDate(value);
  return `${String(date.getDate()).padStart(2, "0")}/${MONTH_LABELS_SHORT[date.getMonth()]}`;
}

/** Formats a "YYYY-MM" key (as returned by the revenues-evolution endpoint) into a short month label. */
export function formatMonthKeyShort(monthKey: string): string {
  const [, month] = monthKey.split("-").map(Number);
  return MONTH_LABELS_SHORT[(month ?? 1) - 1] ?? monthKey;
}

export function formatMonthYearLabel(month: number, year: number): string {
  return `${MONTH_LABELS_FULL[month - 1] ?? month} de ${year}`;
}

export function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0);
  return { from: toISODateString(from), to: toISODateString(to) };
}

export function getLast30DaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: toISODateString(from), to: toISODateString(to) };
}

export function getLast6MonthsRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 5, 1);
  return { from: toISODateString(from), to: toISODateString(to) };
}
