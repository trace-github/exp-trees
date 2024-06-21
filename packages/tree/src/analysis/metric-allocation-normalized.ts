import { CubeSeries } from "@trace/artifacts";
import { Observable, map, zip } from "rxjs";
import { edgePath, oneOfEdgeType, rootNode } from "../tree";
import {
  ComparisonResult,
  EdgeId,
  EdgeType,
  NodeId,
  Subtree,
  Tree,
  TreeEdge,
  ValueFormat
} from "../types";
import { rxMetricAllocation } from "./metric-allocation";

export function rxMetricAllocationNormalized(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<number>> {
  const root = rootNode(tree);
  const [_x, a] = tree.extremities(edge);
  return rxMetricAllocationRollup(tree, root, a, config$, (_edge, attributes) =>
    oneOfEdgeType(attributes, [EdgeType.Arithmetic, EdgeType.Segmentation])
  );
}

export function rxMetricAllocationRollup(
  tree: Tree<CubeSeries>,
  start: NodeId,
  end: NodeId,
  config$: Observable<[Date, Date]>,
  accept: (edge: EdgeId, attributes: TreeEdge) => boolean
): Observable<ComparisonResult<number>> {
  const path = edgePath(tree, start, end, accept);

  return zip(path.map((edge) => rxMetricAllocation(tree, edge, config$))).pipe(
    map((allocations) => {
      const befores: Date[] = [];
      const afters: Date[] = [];

      let normalizedAllocation = 1;
      let normalizedAllocationIsNull = false;
      for (const { before, after, value } of allocations) {
        befores.push(before);
        afters.push(after);

        if (value == null) {
          normalizedAllocationIsNull = true;
          break;
        }

        normalizedAllocation *= value;
      }

      // TODO: Should check if befores/afters have (1) unique value
      const before = befores[0];
      const after = afters[0];

      if (normalizedAllocationIsNull) {
        return { before, after, value: null, format: ValueFormat.Percent };
      } else {
        return {
          before,
          after,
          value: normalizedAllocation,
          format: ValueFormat.Percent
        };
      }
    })
  );
}
