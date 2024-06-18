import { Temporal } from "@js-temporal/polyfill";

/**
 * Computes the start of the day from a ZonedDateTime, with an optional day offset.
 * @param d The ZonedDateTime to calculate from.
 * @param offset Days to offset the start date (default is 0).
 * @returns The start of the day as a ZonedDateTime.
 */
export function startOfDay(
  d: Temporal.ZonedDateTime,
  offset = 0
): Temporal.ZonedDateTime {
  const start = d.with({
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
    microsecond: 0
  });
  return start.add({ days: offset });
}

/**
 * Calculates the start of the week from a ZonedDateTime.
 * @param d The ZonedDateTime to calculate from.
 * @param startOfWeek The day the week starts (0 = Sunday, 6 = Saturday).
 * @param offset Weeks to offset the start date (default is 0).
 * @returns The start of the week as a ZonedDateTime.
 */
export function startOfWeek(
  d: Temporal.ZonedDateTime,
  offset = 0,
  startOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 0
): Temporal.ZonedDateTime {
  const currentDayOfWeek = d.dayOfWeek;

  let start = d;
  if (currentDayOfWeek != startOfWeek) {
    const daysToSubtract = (currentDayOfWeek - startOfWeek) % 7;
    start = d.subtract({ days: daysToSubtract });
  }

  return start.add({ weeks: offset });
}

/**
 * Gets the start of the month from a ZonedDateTime, with an optional month offset.
 * @param d The ZonedDateTime to calculate from.
 * @param offset Months to offset the start date (default is 0).
 * @returns The start of the month as a ZonedDateTime.
 */
export function startOfMonth(
  d: Temporal.ZonedDateTime,
  offset = 0
): Temporal.ZonedDateTime {
  const start = d.with({ day: 1 });
  return start.add({ months: offset });
}

/**
 * Determines the start of the quarter from a ZonedDateTime.
 * @param d The ZonedDateTime to calculate from.
 * @param offset Quarters to offset the start date (default is 0).
 * @returns The start of the quarter as a ZonedDateTime.
 */
export function startOfQuarter(
  d: Temporal.ZonedDateTime,
  offset = 0
): Temporal.ZonedDateTime {
  const quarter = Math.ceil(d.month / 3);
  const startMonth = (quarter - 1) * 3 + 1;
  const start = d.with({ year: d.year, month: startMonth, day: 1 });
  return start.add({ months: offset * 3 });
}

/**
 * Calculates the start of the year from a ZonedDateTime, with an optional year offset.
 * @param d The ZonedDateTime to calculate from.
 * @param offset Years to offset the start date (default is 0).
 * @returns The start of the year as a ZonedDateTime.
 */
export function startOfYear(
  d: Temporal.ZonedDateTime,
  offset = 0
): Temporal.ZonedDateTime {
  const start = d.with({ month: 1, day: 1 });
  return start.add({ years: offset });
}
