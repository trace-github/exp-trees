import { Temporal } from "@js-temporal/polyfill";
import {
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  toZonedDateTime
} from "@trace/common";
import { isSameDay } from "date-fns";
import {
  CalendarTimeGrain,
  CubeTimeGrain,
  CumulativeTimeGrain,
  RollingTimeGrain,
  TimeGrain,
  ToDateTimeGrain,
  WeekStart
} from "./types";

/**
 * Calculates the start of a specified time grain for a given date, considering
 * the UTC time zone and converting it back to the desired time zone.
 *
 * The function converts the input date to a zoned date-time format and adjusts
 * it to the start of the specified time grain (day, week, month, quarter, year)
 * in UTC. It then converts this adjusted time back to the desired time zone.
 *
 * @param date - The original date for which the start of the time grain is to
 *               be calculated.
 * @param timegrain - The time grain to calculate the start of (day, week,
 *                    month, quarter, year).
 * @param timeZone - The desired time zone to which the result will be converted.
 *                    Defaults to the current system time zone.
 * @returns A Date object representing the start of the specified time grain in
 *          the desired time zone.
 */
export function startOfTimeGrain(
  date: Date,
  timegrain: TimeGrain,
  options: {
    offset?: number;
    timeZone?: Temporal.TimeZoneLike;
    weekStartsOn?: WeekStart | undefined;
  } = {}
) {
  const {
    offset = 0,
    timeZone = Temporal.Now.timeZoneId(),
    weekStartsOn
  } = options;
  const localDateTime = toZonedDateTime(date);
  const utcDateTime = localDateTime.withTimeZone("UTC");

  let adjusted: Temporal.ZonedDateTime;
  switch (timegrain) {
    case TimeGrain.Day:
      adjusted = startOfDay(utcDateTime, offset);
      break;
    case TimeGrain.Week: {
      adjusted = startOfWeek(utcDateTime, offset, weekStartsOn);
      break;
    }
    case TimeGrain.Month:
      adjusted = startOfMonth(utcDateTime, offset);
      break;

    case TimeGrain.Quarter:
      adjusted = startOfQuarter(utcDateTime, offset);
      break;

    case TimeGrain.Year: {
      adjusted = startOfYear(utcDateTime, offset);
      break;
    }
  }

  return new Date(
    adjusted.withTimeZone(timeZone).toInstant().epochMilliseconds
  );
}

export function isStartOfTimeGrain(
  timeGrain: CalendarTimeGrain | ToDateTimeGrain,
  options: {
    weekStartsOn?: WeekStart | undefined;
    date?: Date;
  } = {}
): boolean {
  const { weekStartsOn, date = new Date() } = options;
  const grain = parseTimeGrain(timeGrain);
  const start = startOfTimeGrain(date, grain, { weekStartsOn });
  return isSameDay(start, date);
}

export function getTimeGrain(timeGrain: CubeTimeGrain): TimeGrain {
  if (
    isRollingTimeGrain(timeGrain) ||
    isToDateTimeGrain(timeGrain) ||
    isCumulativeTimeGrain(timeGrain)
  ) {
    return timeGrain.split("-")[1] as TimeGrain;
  } else if (isCalendarTimeGrain(timeGrain)) {
    return timeGrain.slice("calendar-".length) as TimeGrain;
  }
  throw `Unknown time grain ${timeGrain}`;
}

/*
 * NOTE: I need to go thru this again and figure out what is actually needed
 */

export function parseTimeGrain(grain: CubeTimeGrain): TimeGrain {
  return grain.split("-")[1] as TimeGrain;
}

export function isCalendarTimeGrain(
  grain: unknown
): grain is CalendarTimeGrain {
  if (typeof grain != "string") return false;
  return grain.startsWith("calendar-");
}

export function isToDateTimeGrain(grain: unknown): grain is ToDateTimeGrain {
  if (typeof grain != "string") return false;
  return grain.startsWith("toDate-");
}

export function isCumulativeTimeGrain(
  grain: unknown
): grain is CumulativeTimeGrain {
  if (typeof grain != "string") return false;
  return grain.startsWith("toDate-") && grain.endsWith("-lifetime");
}

export function isRollingTimeGrain(grain: unknown): grain is RollingTimeGrain {
  if (typeof grain != "string") return false;
  return grain.startsWith("rolling-");
}
