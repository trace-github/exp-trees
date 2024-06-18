import { Temporal } from "@js-temporal/polyfill";
import { add, parse, parseISO, sub } from "date-fns";
import log from "loglevel";

/**
 * Converts a Date or ISO string to a Temporal.ZonedDateTime.
 * @param d The Date object or ISO string to convert.
 * @param timeZone The time zone to use for the conversion. Defaults to the
 *                 current system time zone.
 * @returns A Temporal.ZonedDateTime representation of the given date.
 */
export function toZonedDateTime(
  d: Date | string,
  timeZone: Temporal.TimeZoneLike = Temporal.Now.timeZoneId()
): Temporal.ZonedDateTime {
  let localDate: Temporal.Instant;
  if (d instanceof Date) {
    localDate = Temporal.Instant.fromEpochMilliseconds(d.getTime());
  } else {
    const parsed = parseISO(d);
    localDate = Temporal.Instant.fromEpochMilliseconds(parsed.getTime());
  }

  return localDate.toZonedDateTime({
    calendar: "iso8601",
    timeZone
  });
}

export function toUTCDateString(d: Date | string) {
  const zonedTime = toZonedDateTime(d, "UTC");
  return zonedTime.toPlainDate().toString();
}

/**
 * Parses a date string to a Date object in the specified local timezone or
 * the browser's default timezone if none is provided. The function first
 * parses the input string using a specified format to a Temporal object,
 * converts it to UTC, and then to the local timezone.
 *
 * @param str - The date string to parse.
 * @param options - An optional object with `format`, the date format of the
 * input string (default "yyyy-MM-dd"), and `localTimezone`, the IANA timezone
 * identifier for the output Date object (default to the system's timezone).
 * @returns A Date object representing the time in the specified local timezone.
 */
export function parseAsUTCDate(
  str: string,
  options: {
    format?: string;
    localTimezone?: string;
  } = {}
) {
  const { format = "yyyy-MM-dd", localTimezone = Temporal.Now.timeZoneId() } =
    options;

  let date: Date;
  try {
    date = parse(str, format, new Date());
  } catch (e) {
    log.warn(`Invalid date parse: ${str} (${format})`);
    return null;
  }

  // just extracting the date for now
  const utc = Temporal.PlainDateTime.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds()
  }).toZonedDateTime("utc");

  const local = new Date(
    utc.withTimeZone(localTimezone).toInstant().epochMilliseconds
  );

  return local;
}

/**
 * Convert the provided `target` UTC `Date` to a local timezone `Date` by adding
 * the local timezone's offset from UTC.
 * E.g. : `Fri Mar 31 2023 20:00:00 GMT-0400 (Eastern Daylight Time)` will be
 * converted to `Sat Apr 01 2023 00:00:00 GMT-0400 (Eastern Daylight Time)`. The
 * input date is midnight UTC and the output date is midnight in the local
 * timezone.
 * @deprecated Should convert this to use `Temporal` instead
 */
export function UTCToLocal(target: Date) {
  return add(target, { minutes: target.getTimezoneOffset() });
}

/**
 * Inverse of `UTCToLocal`
 * @deprecated Should convert this to use `Temporal` instead
 */
export function localToUTC(target: Date) {
  return sub(target, { minutes: target.getTimezoneOffset() });
}
