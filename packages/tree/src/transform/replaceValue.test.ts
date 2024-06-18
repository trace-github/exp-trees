import { SeriesBuilder } from "@trace/artifacts-2";
import { parseISO } from "date-fns";
import { replaceValue } from "./replaceValue";

describe("replaceValue", () => {
  const series = new SeriesBuilder("test-slice")
    .addRow({ start: parseISO("2019-10-01") }, 1)
    .build();

  test("should replace value", async () => {
    {
      const result = await replaceValue("test", { start: "2019-10-01", value: 2 })(series);
      expect(result.numRows).toEqual(1);
      expect(result.get(0)?.value).toEqual(2);
    }
  });
});
