import { CubeSeries } from "@trace/artifacts";
import { Observable, map, of, switchMap } from "rxjs";
import { oneOfEdgeType, rootNode } from "../../tree";
import {
  AllocationAnalysisType,
  ComparisonResult,
  EdgeId,
  EdgeType,
  Subtree
} from "../../types";
import { rxMetricAllocationRollup } from "../metric-allocation-normalized";
import { rxMetricChange } from "../metric-change";

export function allocationNormalizedEdge(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): {
  type: EdgeType.Analysis;
  analysis: AllocationAnalysisType.AllocationNormalized;
  data: Observable<ComparisonResult<number>>;
} {
  const data$: Observable<ComparisonResult<number>> = rxAllocationNormalized(
    tree,
    edge,
    config$
  ).pipe(
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
    data: data$
  };

  // return rxAnalysisEdge(
  //   builder,
  //   config,
  //   AllocationAnalysisType.AllocationNormalized,
  //   (_tree, edge, attributes) =>
  //     isEdgeType([EdgeType.Arithmetic, EdgeType.Segmentation])(edge, attributes),
  //   (tree, edge, config) => {
  //     return normalizedAllocation(config, tree, edge).pipe(
  //       switchMap((result) => {
  //         if (result.value == null) return of(result);
  //         const { before, after, value: allocation } = result;
  //         const root = rootNode(tree);
  //         const format = tree.getNodeAttribute(root, "format");
  //         return rxMetricChange([before, after], tree, root).pipe(
  //           map((mc_root) => {
  //             let value: number | null;
  //             if (mc_root == null) {
  //               value = null;
  //             } else {
  //               value = allocation * mc_root;
  //             }
  //             return { before, after, value, format };
  //           }),
  //         );
  //       }),
  //     );
  //   },
  // );
}

function rxAllocationNormalized(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<number>> {
  const root = rootNode(tree);
  const [_x, a] = tree.extremities(edge);
  return rxMetricAllocationRollup(
    tree,
    root,
    a,
    config$,
    (_edge, attributes) => {
      return oneOfEdgeType(attributes, [
        EdgeType.Arithmetic,
        EdgeType.Segmentation
      ]);
    }
  );
}
