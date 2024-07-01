import { CubeSeries } from "@trace/artifacts";
import * as Arrow from "apache-arrow";
import { Observable, map, of, take, zip } from "rxjs";
import { inboundAnalysisEdgeByType } from "../../../tree";
import {
  AllocationAnalysisType,
  CorrelationAnalysisType,
  GrowthRateAnalysisType,
  MixshiftAnalysisType,
  NodeId,
  Subtree
} from "../../../types";
import { arithmeticTable } from "../generators";
import { RowCell, RowFunc } from "../types";
import { mergeRowCells } from "../utils";

export function analysisTable(
  id: string,
  tree: Subtree<CubeSeries>,
  ordering: NodeId[],
  input$: Observable<
    AllocationAnalysisType | GrowthRateAnalysisType | CorrelationAnalysisType
  >,
  maxDepth?: number
): Observable<Arrow.Table> {
  return arithmeticTable(tree, ordering, input$, analysisValue$, {
    maxDepth,
    prefix: id
  });
}

const analysisValue$: RowFunc<
  CubeSeries,
  | AllocationAnalysisType
  | GrowthRateAnalysisType
  | CorrelationAnalysisType
  | MixshiftAnalysisType
> = (tree, nodes, input) => {
  const columns$: Observable<RowCell>[] = [];
  for (const node of nodes) {
    const metricName = tree.getNodeAttribute(node, "metricName");
    const analysisEdge = inboundAnalysisEdgeByType(tree, node, input);

    if (analysisEdge == undefined) {
      columns$.push(of({ [metricName]: undefined }));
    } else {
      const [_edge, attributes] = analysisEdge;

      switch (attributes.analysis) {
        case MixshiftAnalysisType.MixshiftAverage:
        case MixshiftAnalysisType.MixshiftMetricChangeFirst:
        case MixshiftAnalysisType.MixshiftSegmentChangeFirst:
          columns$.push(
            attributes.data.pipe(
              map((d) => {
                return {
                  [`${metricName}_allocation`]: d.value?.allocation,
                  [`${metricName}_dueToMetric`]: d.value?.dueToMetric,
                  [`${metricName}_dueToVolume`]: d.value?.dueToVolume
                };
              }),
              take(1)
            )
          );
          break;

        case AllocationAnalysisType.Allocation:
        case AllocationAnalysisType.AllocationNormalized:
        case GrowthRateAnalysisType.GrowthRate:
        case GrowthRateAnalysisType.GrowthRateNormalized:
        case CorrelationAnalysisType.Correlation:
          columns$.push(
            attributes.data.pipe(
              map((value) => {
                return {
                  [metricName]: value.value
                };
              }),
              take(1)
            )
          );
          break;
      }
    }
  }

  return zip(columns$).pipe(mergeRowCells());
};
