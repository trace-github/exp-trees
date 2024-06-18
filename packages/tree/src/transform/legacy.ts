import { sub } from "date-fns";

/**
 * Inverse of `UTCToLocal`
 *
 * @deprecated Should convert this to use `Temporal` instead
 */
export function localToUTC(target: Date) {
  return sub(target, { minutes: target.getTimezoneOffset() });
}
