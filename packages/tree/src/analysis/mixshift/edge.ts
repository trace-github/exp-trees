import { CubeSeries } from "@trace/artifacts";
import {
  Observable,
  OperatorFunction,
  concatMap,
  map,
  of,
  shareReplay
} from "rxjs";
import {
  ComparisonResult,
  EdgeId,
  EdgeType,
  MixshiftAnalysisType,
  MixshiftResult,
  Subtree
} from "../../types";
import { rxMetricChange } from "../metric-change";
import {
  mixshiftAverage,
  mixshiftMetricChangeFirst,
  mixshiftSegmentChangeFirst
} from "./mixshift";

export function mixshiftMetricChangeFirstEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: MixshiftAnalysisType.MixshiftMetricChangeFirst;
  data: Observable<ComparisonResult<MixshiftResult>>;
} {
  return {
    type: EdgeType.Analysis,
    analysis: MixshiftAnalysisType.MixshiftMetricChangeFirst,
    data: mixshiftMetricChangeFirst(tree, edge, config$).pipe(
      map((result) => ({ tree, edge, result })),
      rxFinalizeMixshiftResult(),

      shareReplay(1)
    )
  };
}

export function mixshiftMetricSegmentChangeFirstEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: MixshiftAnalysisType.MixshiftSegmentChangeFirst;
  data: Observable<ComparisonResult<MixshiftResult>>;
} {
  return {
    type: EdgeType.Analysis,
    analysis: MixshiftAnalysisType.MixshiftSegmentChangeFirst,
    data: mixshiftSegmentChangeFirst(tree, edge, config$).pipe(
      map((result) => ({ tree, edge, result })),
      rxFinalizeMixshiftResult(),
      shareReplay(1)
    )
  };
}

export function mixshiftAverageEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: MixshiftAnalysisType.MixshiftAverage;
  data: Observable<ComparisonResult<MixshiftResult>>;
} {
  return {
    type: EdgeType.Analysis,
    analysis: MixshiftAnalysisType.MixshiftAverage,
    data: mixshiftAverage(tree, edge, config$).pipe(
      map((result) => ({ tree, edge, result })),
      rxFinalizeMixshiftResult()
    )
  };
}

function rxFinalizeMixshiftResult(): OperatorFunction<
  {
    result: ComparisonResult<MixshiftResult>;
    tree: Subtree<CubeSeries>;
    edge: EdgeId;
  },
  ComparisonResult<MixshiftResult>
> {
  return (obs) =>
    obs.pipe(
      concatMap(({ tree, edge, result }) => {
        if (result.value == null) {
          return of(result);
        }

        const { before, after, value: mixshift } = result;
        const [source] = tree.extremities(edge);
        const format = tree.getNodeAttribute(source, "format");

        return rxMetricChange([before, after], tree, source).pipe(
          map((mc_source) => {
            let value: MixshiftResult | null = null;
            // if (mc_source == null) {
            //   value = null;
            // } else {
            //   value = {
            //     type: mixshift.type,
            //     allocation: mixshift.allocation * mc_source,
            //     dueToMetric: mixshift.dueToMetric * mc_source,
            //     dueToVolume: mixshift.dueToVolume * mc_source
            //   };
            // }

            return { before, after, value, format };
          })
        );
      })
    );
}
