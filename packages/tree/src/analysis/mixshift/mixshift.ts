import { CubeSeries, findCubeSeriesValueAtDate } from "@trace/artifacts";
import { Observable, map, switchMap, zip } from "rxjs";
import {
  ComparisonResult,
  EdgeId,
  MixshiftAnalysisType,
  MixshiftResult,
  Subtree,
  ValueFormat
} from "../../types";
import { AnalysisError } from "../errors";
import {
  rxMetricChange,
  rxSegmentImpact,
  rxSegmentWeight
} from "../metric-change";

export function mixshiftMetricChangeFirst(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<MixshiftResult>> {
  // mustBeEdgeType(tree, edge, EdgeType.Segmentation);

  const [x, x_a] = tree.extremities(edge);

  return config$.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxSegmentWeight(before, tree, x_a),
        rxSegmentImpact([before, after], tree, x_a),
        rxMetricChange([before, after], tree, x_a),
        rxMetricChange([before, after], tree, x)
      ).pipe(
        map(([beforeWeight, allocation, mc_x_a, mc_x]) => {
          let value: MixshiftResult | null;
          if (
            beforeWeight == null ||
            mc_x_a == null ||
            mc_x == null ||
            allocation == null
          ) {
            value = null;
          } else {
            const dueToMetric = beforeWeight * mc_x_a;
            const dueToVolume = allocation - dueToMetric;
            value = {
              type: MixshiftAnalysisType.MixshiftMetricChangeFirst,
              allocation: allocation / mc_x,
              dueToMetric: dueToMetric / mc_x,
              dueToVolume: dueToVolume / mc_x
            };
          }
          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}

export function mixshiftSegmentChangeFirst(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<MixshiftResult>> {
  // mustBeEdgeType(tree, edge, EdgeType.Segmentation);

  const [x, x_a] = tree.extremities(edge);
  const series = tree.getNodeAttribute(x_a, "data");

  if (!series) throw AnalysisError.InvalidSeries;

  return zip(config$, series).pipe(
    switchMap(([[before, after], series]) => {
      return zip([
        rxSegmentWeight(before, tree, x_a),
        rxSegmentWeight(after, tree, x_a),
        rxSegmentImpact([before, after], tree, x_a),
        rxMetricChange([before, after], tree, x)
      ]).pipe(
        map(([beforeWeight, afterWeight, allocation, mc_x]) => {
          let value: MixshiftResult | null;

          const beforeValue = findCubeSeriesValueAtDate(series, before);

          if (
            beforeWeight == null ||
            afterWeight == null ||
            allocation == null ||
            beforeValue == null ||
            mc_x == null
          ) {
            value = null;
          } else {
            const dueToVolume = (afterWeight - beforeWeight) * beforeValue;
            const dueToMetric = allocation - dueToVolume;
            value = {
              type: MixshiftAnalysisType.MixshiftSegmentChangeFirst,
              allocation: allocation / mc_x,
              dueToMetric: dueToMetric / mc_x,
              dueToVolume: dueToVolume / mc_x
            };
          }

          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}

export function mixshiftAverage(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<MixshiftResult>> {
  // mustBeEdgeType(tree, edge, EdgeType.Segmentation);

  const [_x, _x_a] = tree.extremities(edge);

  return zip(
    mixshiftMetricChangeFirst(tree, edge, config$),
    mixshiftSegmentChangeFirst(tree, edge, config$)
  ).pipe(
    map(([metricChange, segmentChange]) => {
      if (metricChange.value == null || segmentChange.value == null) {
        return {
          before: metricChange.before,
          after: metricChange.after,
          value: null,
          format: ValueFormat.Percent
        };
      }

      const allocation = average([
        metricChange.value.allocation,
        segmentChange.value.allocation
      ]);
      const dueToMetric = average([
        metricChange.value.dueToMetric,
        segmentChange.value.dueToMetric
      ]);
      const dueToVolume = average([
        metricChange.value.dueToVolume,
        segmentChange.value.dueToVolume
      ]);
      return {
        before: metricChange.before,
        after: metricChange.after,
        value: {
          type: MixshiftAnalysisType.MixshiftAverage,
          allocation,
          dueToMetric,
          dueToVolume
        },
        format: ValueFormat.Percent
      };
    })
  );
}

function average(array: number[]): number {
  const sum = array.reduce((a, b) => a + b, 0);
  return sum / array.length;
}
