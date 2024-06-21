import { CubeSeries } from "@trace/artifacts";
import { Observable, defer, map, of, switchMap } from "rxjs";
import { rootNode } from "../../tree";
import {
  AllocationAnalysisType,
  ComparisonResult,
  EdgeId,
  EdgeType,
  Subtree
} from "../../types";
import { rxMetricAllocation } from "../metric-allocation";
import { rxMetricAllocationNormalized } from "../metric-allocation-normalized";
import { rxMetricChange } from "../metric-change";

export function allocationEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: AllocationAnalysisType.Allocation;
  data: Observable<ComparisonResult<number>>;
} {
  const data$ = rxMetricAllocation(tree, edge, config$).pipe(
    switchMap((result) => {
      if (result.value == null) return of(result);

      const { before, after, value: allocation } = result;
      const [source] = tree.extremities(edge);
      const format = tree.getNodeAttribute(source, "format");

      return rxMetricChange([before, after], tree, source).pipe(
        map((mc_source) => {
          let value: number | null = null;
          if (mc_source == null) {
            value = null;
          } else {
            value = allocation * mc_source;
          }

          return { before, after, value, format };
        })
      );
    })
  );

  return {
    type: EdgeType.Analysis,
    analysis: AllocationAnalysisType.Allocation,
    data: defer(() => data$)
  };
}

export function allocationNormalizedEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: AllocationAnalysisType.AllocationNormalized;
  data: Observable<ComparisonResult<number>>;
} {
  const data$: Observable<ComparisonResult<number>> =
    rxMetricAllocationNormalized(tree, edge, config$).pipe(
      switchMap((result) => {
        if (result.value == null) return of(result); // ?

        const { before, after, value: allocation } = result;

        const root = rootNode(tree);
        const format = tree.getNodeAttribute(root, "format");
        return rxMetricChange([before, after], tree, root).pipe(
          map((mc_root) => {
            let value: number | null;
            if (mc_root == null) {
              value = null;
            } else {
              value = allocation * mc_root;
            }
            return { before, after, value, format };
          })
        );
      })
    );

  return {
    type: EdgeType.Analysis,
    analysis: AllocationAnalysisType.AllocationNormalized,
    data: defer(() => data$)
  };
}
