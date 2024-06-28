import { CubeSeries, findCubeSeriesValueAtDate } from "@trace/artifacts";
import { Observable, map, of } from "rxjs";
import { calculateGrowthRate } from "../../analysis/metric-growth-rate";
import { NodeId, Subtree, Tree } from "../../types";
import { Cell } from "./types";

export function growthRateCell(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  node: NodeId,
  comparison: [null, null] | [Date, null] | [Date, Date]
): Observable<Cell> {
  const [before, after] = comparison;

  const { data: series$, metricName } = tree.getNodeAttributes(node);

  if (before == null || after == null) {
    return of({ column: metricName, value: undefined });
  }

  if (series$ == undefined) {
    return of({ column: metricName, value: undefined });
  }

  return series$.pipe(
    map((series) => {
      const beforeValue = findCubeSeriesValueAtDate(series, before);
      const afterValue = findCubeSeriesValueAtDate(series, after);

      console.log(beforeValue, afterValue);

      return {
        column: metricName,
        value: calculateGrowthRate(beforeValue, afterValue)
      };
    })
  );
}
