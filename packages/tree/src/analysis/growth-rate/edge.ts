import { CubeSeries } from "@trace/artifacts";
import {
  Observable,
  combineLatest,
  concatMap,
  defer,
  map,
  of,
  zip
} from "rxjs";
import { outboundEdgesByType } from "../../tree";
import {
  ComparisonResult,
  EdgeId,
  EdgeType,
  GrowthRateAnalysisType,
  Subtree,
  Tree,
  ValueFormat
} from "../../types";
import { sumComparisonResults } from "../comparison";
import { AnalysisError } from "../errors";
import { rxMetricAllocation } from "../metric-allocation";
import { rxMetricAllocationNormalized } from "../metric-allocation-normalized";
import { rxMetricGrowthRate } from "../metric-growth-rate";
import { edgeData } from "../utils";

export const growthRateForEdgeType = {
  [EdgeType.Arithmetic]: arithmeticGrowthRateEdgeAttributes,
  [EdgeType.Segmentation]: segmentationGrowthRateEdgeAttributes
};

function arithmeticGrowthRateEdgeAttributes(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: GrowthRateAnalysisType.GrowthRate;
  data: Observable<ComparisonResult<number>>;
} {
  const {
    attributes,
    sourceAttributes: { data: source$ }
  } = edgeData(tree, edge);

  if (source$ == undefined) {
    throw AnalysisError.InvalidSeries;
  }
  if (attributes.type != EdgeType.Arithmetic) {
    throw AnalysisError.UnexpectedEdgeType;
  }

  const data$ = combineLatest({
    growthRate: rxMetricGrowthRate(config$, source$),
    allocation: rxMetricAllocation(tree, edge, config$)
  }).pipe(
    map(
      ({
        growthRate: { before, after, value: growthRate },
        allocation: { value: allocation }
      }) => {
        let value: number | null;
        if (growthRate == null || allocation == null) {
          value = null;
        } else {
          value = growthRate * allocation;
        }

        return { before, after, value, format: ValueFormat.Percent };
      }
    )
  );

  return {
    type: EdgeType.Analysis,
    analysis: GrowthRateAnalysisType.GrowthRate,
    data: defer(() => data$)
  };
}

function segmentationGrowthRateEdgeAttributes(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: GrowthRateAnalysisType.GrowthRate;
  data: Observable<ComparisonResult<number>>;
} {
  const {
    attributes,
    sourceAttributes: { data: source$ }
  } = edgeData(tree, edge);

  if (source$ == undefined) throw AnalysisError.InvalidSeries;
  if (attributes.type != EdgeType.Segmentation) {
    throw AnalysisError.UnexpectedEdgeType;
  }

  const [, target] = tree.extremities(edge);
  const outboundEdgeMap = outboundEdgesByType(
    tree,
    target,
    EdgeType.Arithmetic
  );
  const outboundEdges = Object.keys(outboundEdgeMap);

  // Sum the immediate arithmetic children growth rates.
  const data$ = of(outboundEdges).pipe(
    concatMap((edges) => {
      return zip(
        edges.map(
          (edge) => arithmeticGrowthRateEdgeAttributes(tree, edge, config$).data
        )
      );
    }),
    map(sumComparisonResults)
  );

  return {
    type: EdgeType.Analysis,
    analysis: GrowthRateAnalysisType.GrowthRate,
    data: defer(() => data$)
  };
}

export function growthRateNormalizedEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: GrowthRateAnalysisType.GrowthRateNormalized;
  data: Observable<ComparisonResult<number>>;
} {
  const {
    attributes,
    sourceAttributes: { data: source$ }
  } = edgeData(tree, edge);

  if (source$ == undefined) throw AnalysisError.InvalidSeries;
  if (
    attributes.type != EdgeType.Arithmetic &&
    attributes.type != EdgeType.Segmentation
  ) {
    throw AnalysisError.UnexpectedEdgeType;
  }

  const data$ = combineLatest({
    growthRate: rxMetricGrowthRate(config$, source$),
    allocation: rxMetricAllocationNormalized(tree, edge, config$)
  }).pipe(
    map(
      ({
        growthRate: { before, after, value: growthRate },
        allocation: { value: allocation }
      }) => {
        let value: number | null;
        if (growthRate == null || allocation == null) {
          value = null;
        } else {
          value = growthRate * allocation;
        }

        return { before, after, value, format: ValueFormat.Percent };
      }
    )
  );

  return {
    type: EdgeType.Analysis,
    analysis: GrowthRateAnalysisType.GrowthRateNormalized,
    data: data$
  };
}
