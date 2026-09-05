const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

/** Parses a "YYYY-MM-DD" (or full ISO) string into a UTC-midnight Date, safe for `@db.Date` columns. */
export function parseDateOnly(value: string): Date {
  const datePart = value.slice(0, 10);
  return new Date(`${datePart}T00:00:00.000Z`);
}

/** Formats a `@db.Date` value back into "YYYY-MM-DD" using its UTC calendar date. */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns today's calendar date in America/Sao_Paulo, as a UTC-midnight Date. */
export function startOfTodaySaoPaulo(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parseDateOnly(parts);
}

/** Truncates a date-only value to the 1st of its UTC calendar month. */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function addDaysToDateOnly(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function addMonthsToDateOnly(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function addWeeksToDateOnly(date: Date, weeks: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + weeks * 7);
  return result;
}

export function addYearsToDateOnly(date: Date, years: number): Date {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}
