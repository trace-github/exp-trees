import { CubeSeries, findCubeSeriesValueAtDate } from "@trace/artifacts";
import { Observable, map } from "rxjs";
import { NodeId, Subtree } from "../types";
import { AnalysisError } from "./errors";

const BASICALLY_ZERO = 0.001;

export function rxMetricRatio(
  config: [Date, Date],
  tree: Subtree<CubeSeries>,
  node: NodeId,
  nSiblings: number | undefined = undefined
): Observable<number | null> {
  // mustHaveNode(tree, node);

  const series = tree.getNodeAttribute(node, "data");

  if (!series) throw AnalysisError.InvalidSeries;

  return series.pipe(
    map((series) => {
      return metricRatio(series, ...config, {
        zeroThreshold: BASICALLY_ZERO,
        subDenomZero: Math.exp(Math.log(0.5) / (nSiblings || 1))
      });
    })
  );
}

// Metric "ratio"
// x = node
// ratio = x_t1 / x_t0

export function metricRatio(
  series: CubeSeries,
  before: Date,
  after: Date,
  options: {
    zeroThreshold?: number;
    subDenomZero?: number;
  } = {}
): number | null {
  const x_t0 = findCubeSeriesValueAtDate(series, before);
  const x_t1 = findCubeSeriesValueAtDate(series, after);

  return calculateRatio(x_t0, x_t1, options);
}

function calculateRatio(
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
    return before / after;
  } else if (Math.abs(after - before) < zeroThreshold) {
    // divide by zero but no change
    return 0;
  } else {
    // divide by zero but has a change
    return after / subDenomZero;
  }
}
