import { CubeSeries } from "@trace/artifacts";
import { toUTCDateString } from "@trace/common";
import { quantileSeq } from "mathjs";
import { printTable } from "../lib";

export function printCubeSeries(series: CubeSeries): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = new Array(series.numRows);

  for (let r = 0; r < series.numRows; r++) {
    const row = series.get(r);

    if (row == null) continue;

    rows[r] = [
      toUTCDateString(row.a.start),
      row.cnt == null ? "NULL" : row.cnt,
      row.value == null ? "NULL" : row.value
    ];
  }

  printTable(["date", "cnt", "value"], ...rows);
}

export function printPerformanceTable(name: string): void {
  const measurements = performance.getEntriesByName(name, "measure");

  const durations = measurements.map(({ duration }) => duration);

  if (durations.length == 0) {
    return;
  }

  if (durations.length == 1) {
    printTable(
      ["name", "#", "duration"],
      [name, durations.length, `${durations[0].toPrecision(4)} ms`]
    );
  } else {
    const durationQuantiles = {
      p50: quantileSeq(durations, 0.5, false),
      p95: quantileSeq(durations, 0.95, false)
    };
    printTable(
      ["name", "#", "duration"],
      [
        name,
        durations.length,
        Object.entries(durationQuantiles).reduce((acc, curr) => {
          const [key, value] = curr;
          return `${acc}\n${key} = ${value.toPrecision(4)} ms`.trim();
        }, "")
      ]
    );
  }
}
