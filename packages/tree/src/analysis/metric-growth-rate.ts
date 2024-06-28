import { CubeSeries, findCubeSeriesValueAtDate } from "@trace/artifacts";
import { Observable, combineLatest, map } from "rxjs";
import { ComparisonResult, ValueFormat } from "../types";

export function rxMetricGrowthRate(
  config$: Observable<[Date, Date]>,
  series$: Observable<CubeSeries>
): Observable<ComparisonResult<number>> {
  return combineLatest({
    config: config$,
    series: series$
  }).pipe(
    map(({ series, config: [before, after] }) => {
      const x_t0 = findCubeSeriesValueAtDate(series, before);
      const x_t1 = findCubeSeriesValueAtDate(series, after);

      return {
        before,
        after,
        value: calculateGrowthRate(x_t0, x_t1),
        format: ValueFormat.Percent
      };
    })
  );
}

export function calculateGrowthRate(
  before: number | null,
  after: number | null,
  options: {
    zeroThreshold?: number;
    subDenomZero?: number;
  } = {}
): number | null {
  const { zeroThreshold = 0, subDenomZero = 0 } = options;

  if (before == null || after == null) return null;

  if (Math.abs(before) > zeroThreshold) {
    return (after - before) / Math.abs(before);
  } else if (Math.abs(after - before) < zeroThreshold) {
    // divide by zero but no change
    return 0;
  } else {
    // divide by zero but has a change
    return after / subDenomZero;
  }
}
