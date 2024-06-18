import { parseAsUTCDate, toUTCDateString } from "./tz";

describe("tz", () => {
  const MIDNIGHT_NYC = "2023-12-31T23:59:59-05:00";
  const MIDNIGHT_PARIS = "2023-12-31T23:59:59+01:00";
  const MIDNIGHT_TOKYO = "2023-12-31T23:59:59+09:00";
  const MIDNIGHT_GMT = "2023-12-31T23:59:59+00:00";

  test.each<{ input: string; expected: string }>([
    { input: MIDNIGHT_NYC, expected: "2024-01-01" },
    { input: MIDNIGHT_PARIS, expected: "2023-12-31" }, // still the 12-13 in UTC
    { input: MIDNIGHT_TOKYO, expected: "2023-12-31" }, // still the 12-13 in UTC
    { input: MIDNIGHT_GMT, expected: "2023-12-31" }, // still the 12-13 in UTC
  ])("should convert to UTC date string $input", ({ input, expected }) => {
    const actual = toUTCDateString(input);
    expect(actual).toEqual(expected);
  });

  test.each<{ input: string; expected: string }>([
    { input: "2024-01-01", expected: "2024-01-01T00:00:00.000Z" },
  ])("should parse a UTC string into local time $input", ({ input, expected }) => {
    const actual = parseAsUTCDate(input, { localTimezone: "Asia/Tokyo" });

    // We really need to the locale time, but gha is in utc and its confusing me.
    expect(actual?.toISOString()).toEqual(expected);
  });
});
