import { CubeSeries, findCubeSeriesValueAtDate } from "@trace/artifacts";
import { Observable, map, zip } from "rxjs";
import { hasOutboundEdgeOfType, isEdgeType } from "../tree";
import { EdgeType, NodeId, NodeType, Tree } from "../types";
import { AnalysisError } from "./errors";

export function rxMetricChange(
  config: [Date, Date],
  tree: Tree<CubeSeries>,
  node: NodeId
): Observable<number | null> {
  const series = tree.getNodeAttribute(node, "data");

  if (!series) throw AnalysisError.InvalidSeries;

  return series.pipe(map((series) => metricChange(series, ...config, 1, 1)));
}

// Metric Change
// x = node
// metricChange = x_t1 - x_t0

function metricChange(
  series: CubeSeries,
  before: Date,
  after: Date,
  beforeWeight: number | null,
  afterWeight: number | null
): number | null {
  if (beforeWeight === null || afterWeight === null) return null;

  const x_t0 = findCubeSeriesValueAtDate(series, before);
  const x_t1 = findCubeSeriesValueAtDate(series, after);

  if (x_t0 == null || x_t1 == null) return null;

  return afterWeight * x_t1 - beforeWeight * x_t0;
}

export function rxSegmentWeight(
  date: Date,
  tree: Tree<CubeSeries>,
  node: NodeId
): Observable<number | null> {
  if (!hasOutboundEdgeOfType(tree, node, EdgeType.Segmentation)) {
    throw AnalysisError.UnexpectedEdgeType;
  }

  const x = tree.inNeighbors(node)[0];
  const x_s_attrs = tree.getNodeAttributes(node);
  const x_attrs = tree.getNodeAttributes(x);
  if (
    x_attrs.type !== NodeType.Operator ||
    x_attrs.operator !== "/" ||
    x_s_attrs.type !== NodeType.Operator ||
    x_s_attrs.operator !== "/"
  )
    throw AnalysisError.UnexpectedEdgeType;

  // below assumes that the denominator is the last term
  let segmentSeries: Observable<CubeSeries> | undefined;
  let parentSeries: Observable<CubeSeries> | undefined;
  tree.forEachOutEdge(x, (_edge, attributes, _s, _t, _sA, targetAttributes) => {
    if (isEdgeType(attributes, EdgeType.Arithmetic)) {
      parentSeries = targetAttributes.data;
    }
  });
  tree.forEachOutEdge(
    node,
    (_edge, attributes, _s, _t, _sA, targetAttributes) => {
      if (isEdgeType(attributes, EdgeType.Arithmetic)) {
        segmentSeries = targetAttributes.data;
      }
    }
  );

  if (!segmentSeries || !parentSeries) throw AnalysisError.InvalidSeries;

  return zip(segmentSeries, parentSeries).pipe(
    map(([segmentSeries, parentSeries]) =>
      segmentWeight(segmentSeries, parentSeries, date)
    )
  );
}

// Segment weight
// x = a / b
// x --A-- a
//   --A-- b
//   --S---- x_s --A-- a_s
//               --A-- b_s
// x_s = node
// weight for segment = b_s / b

export function segmentWeight(
  segmentSeries: CubeSeries,
  parentSeries: CubeSeries,
  date: Date
): number | null {
  const b = findCubeSeriesValueAtDate(parentSeries, date);
  const b_s = findCubeSeriesValueAtDate(segmentSeries, date);

  if (!b || !b_s) return null;

  return b_s / b;
}

export function rxSegmentImpact(
  config: [Date, Date],
  tree: Tree<CubeSeries>,
  node: NodeId
): Observable<number | null> {
  const series = tree.getNodeAttribute(node, "data");

  if (!series) throw AnalysisError.InvalidSeries;

  return zip(
    rxSegmentWeight(config[0], tree, node),
    rxSegmentWeight(config[1], tree, node),
    series
  ).pipe(
    map(([beforeWeight, afterWeight, series]) =>
      metricChange(series, ...config, beforeWeight, afterWeight)
    )
  );
}
