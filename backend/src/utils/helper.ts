import { addDays, addMonths, addWeeks, addYears, startOfMonth } from "date-fns";
import { RecurringIntervalEnum } from "../models/transaction.model.js";
import type { DateRangePreset } from "../enums/date-range.enum.js";
import { DateRangeEnum } from "../enums/date-range.enum.js";


/**
 * Calculates the next report date (safe monthly scheduler).
 * If lastSentDate is in the future, uses current date as reference.
 * Returns the first day of the next month at 00:00:00 UTC.
 */
export function calculateNextReportDate(lastSentDate?: Date): Date {
  const now = new Date();
  const last = lastSentDate ? new Date(lastSentDate) : now;
  const reference = last > now ? now : last;

  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() + 1; // next month (0-based)
  const nextUtc = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  console.log(
    "calculateNextReportDate -> reference:",
    reference.toISOString(),
    " nextUtc:",
    nextUtc.toISOString()
  );

  return nextUtc;
}


/** Type guard: checks runtime values against the enum values */
function isRecurringIntervalEnum(v: any): v is RecurringIntervalEnum {
  return Object.values(RecurringIntervalEnum).includes(v);
}

/**
 * Normalize a value (enum or string) to RecurringIntervalEnum, or undefined if missing/invalid.
 * Accepts values such as RecurringIntervalEnum.DAILY, "DAILY", "daily", etc.
 */
function normalizeRecurringInterval(
  v?: RecurringIntervalEnum | string | null
): RecurringIntervalEnum | undefined {
  if (v == null) return undefined;
  if (isRecurringIntervalEnum(v)) return v;

  const asUpper = String(v).toUpperCase();
  const match = (Object.values(RecurringIntervalEnum) as string[]).find(
    (val) => String(val).toUpperCase() === asUpper
  );
  return match as RecurringIntervalEnum | undefined;
}

/**
 * Calculate the next occurrence given a base date and a recurring interval.
 * Accepts either RecurringIntervalEnum or string-like values (e.g. "DAILY").
 */
export function calculateNextOccurrence(
  date: Date,
  recurringInterval?: RecurringIntervalEnum | string | null
): Date {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);

  const interval = normalizeRecurringInterval(recurringInterval);

  switch (interval) {
    case RecurringIntervalEnum.DAILY:
      return addDays(base, 1);
    case RecurringIntervalEnum.WEEKLY:
      return addWeeks(base, 1);
    case RecurringIntervalEnum.MONTHLY:
      return addMonths(base, 1);
    case RecurringIntervalEnum.YEARLY:
      return addYears(base, 1);
    default:
      // If interval is undefined or not recognized, return base (no change)
      return base;
  }
}

export function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

/**
 * Normalizes query-string presets (case-insensitive, trims whitespace) so that
 * values like "Last3Months", "last3months", etc. map to `DateRangeEnum`.
 */
export function normalizeDateRangePreset(
  value?: unknown
): DateRangePreset | undefined {
  if (value == null) return undefined;

  const raw = Array.isArray(value) ? value[0] : value;
  const stringValue =
    typeof raw === "string"
      ? raw
      : typeof raw === "number" || typeof raw === "boolean"
      ? String(raw)
      : undefined;

  if (!stringValue) return undefined;

  const key = stringValue.trim().toLowerCase();
  const match = Object.values(DateRangeEnum).find(
    (preset) => preset.toLowerCase() === key
  );
  return match as DateRangePreset | undefined;
}

