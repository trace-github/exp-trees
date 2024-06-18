import { quantileSeq } from "mathjs";
import { printTable } from "../lib";

export function performanceTable(name: string): void {
  const measurements = performance.getEntriesByName(name, "measure");

  const durations = measurements.map(({ duration }) => duration);

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
