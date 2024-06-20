import { CubeSeries } from "@trace/artifacts";
import { Observable, concatMap, defer, map, of, zip } from "rxjs";
import { outboundEdgesByType } from "../../tree";
import {
  ComparisonResult,
  EdgeId,
  EdgeType,
  GrowthRateAnalysisType,
  Subtree,
  Tree
} from "../../types";
import { sumComparisonResults } from "../comparison-result";
import { AnalysisError } from "../errors";
import { edgeData } from "../utils";
import { rxGrowthRate } from "./calc";

export const growthRateForEdgeType = {
  [EdgeType.Arithmetic]: arithmeticGrowthRateEdgeAttributes,
  [EdgeType.Segmentation]: segmentationGrowthRateEdgeAttributes
};

function arithmeticGrowthRateEdgeAttributes(
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
  if (attributes.type != EdgeType.Arithmetic) {
    throw AnalysisError.UnexpectedEdgeType;
  }

  return {
    type: EdgeType.Analysis,
    analysis: GrowthRateAnalysisType.GrowthRate,
    data: defer(() => rxGrowthRate(config$, source$))
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
  const data$ = of(Object.keys(outboundEdges)).pipe(
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
