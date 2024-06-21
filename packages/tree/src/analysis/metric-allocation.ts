import { CubeSeries } from "@trace/artifacts";
// import log from "loglevel";
import { Observable, map, switchMap, zip } from "rxjs";
import { edgeIndexByType, nodeByType, outboundEdgesByType } from "../tree";
import {
  ComparisonResult,
  EdgeId,
  EdgeType,
  NodeType,
  Subtree,
  ValueFormat
} from "../types";
import { AnalysisError } from "./errors";
import { rxMetricChange } from "./metric-change";
import { rxMetricRatio } from "./ratio";

/**
 * Calculates the allocation percentage based on the type of arithmetic or
 * segmentation operation applied between nodes in a given tree structure. The
 * calculation varies depending on the operation: addition, subtraction,
 * multiplication, division, or segmentation, utilizing metric changes or
 * growth rates between a source and a target node over a specified period.
 * Throws `AnalysisError.InvalidNodeType` or `AnalysisError.InvalidEdgeType`
 * for invalid configurations.
 *
 * @param config$ - An Observable emitting a tuple of Dates representing the
 * period for analysis.
 * @param tree - The tree structure containing nodes and edges with associated
 * CubeSeries data.
 * @param edge - The edge identifier for which the allocation calculation is
 * to be performed.
 * @returns An Observable emitting the allocation percentage as a
 * `ComparisonResult`, which may be null if calculations cannot be
 * performed due to missing data.
 */
export function rxMetricAllocation(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<number>> {
  const attributes = tree.getEdgeAttributes(edge);

  switch (attributes.type) {
    case EdgeType.Arithmetic: {
      const [source] = tree.extremities(edge);

      const attributes = nodeByType(tree, source, NodeType.Operator);
      if (attributes == undefined) {
        throw AnalysisError.MissingNode;
      }

      switch (attributes.operator) {
        case "*":
          return productAllocation(config$, tree, edge);
        case "+":
          return additionAllocation(config$, tree, edge);
        case "-":
          return subtractionAllocation(config$, tree, edge);
        case "/":
          return divisionAllocation(config$, tree, edge);
      }
    }

    case EdgeType.Segmentation:
      return segmentAllocation(tree, edge, config$);
  }

  throw AnalysisError.UnexpectedEdgeType;
}

// Allocation: addition
// x = source, a = target
// allocation = metricChange(a)  / metricChange(x)

function additionAllocation(
  config: Observable<[Date, Date]>,
  tree: Subtree<CubeSeries>,
  edge: EdgeId
): Observable<ComparisonResult<number>> {
  const [x, a] = tree.extremities(edge);

  return config.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxMetricChange([before, after], tree, x),
        rxMetricChange([before, after], tree, a)
      ).pipe(
        map(([mc_x, mc_a]) => {
          let value: number | null;

          if (mc_x == null || mc_a == null) {
            value = null;
          } else {
            value = mc_a / mc_x;
          }

          return {
            before,
            after,
            value,
            format: ValueFormat.Percent
          };
        })
      );
    })
  );
}

// Allocation: subtraction
// x = source, b = target
//
// when first arithmetic child:
//   allocation = metricChange(a) / metricChange(x)
// else
//   allocation = -1 * metricChange(a) / metricChange(x)

function subtractionAllocation(
  config: Observable<[Date, Date]>,
  tree: Subtree<CubeSeries>,
  edge: EdgeId
): Observable<ComparisonResult<number>> {
  // mustBeEdgeType(tree, edge, EdgeType.Arithmetic);

  const [x, a] = tree.extremities(edge);

  // mustBeArithmeticOperator(tree, x, "-");

  return config.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxMetricChange([before, after], tree, x),
        rxMetricChange([before, after], tree, a)
      ).pipe(
        map(([mc_x, mc_a]) => {
          let value: number | null;

          if (mc_x == null || mc_a == null) {
            value = null;
          } else {
            const [edgeIdx] = edgeIndexByType(tree, edge, EdgeType.Arithmetic);
            if (edgeIdx == 0) {
              value = mc_a / mc_x;
            } else {
              value = -1 * (mc_a / mc_x);
            }
          }

          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}

// Allocation: product
//
// x = source, b = target
//
// allocation = Log[growthRatio(a)] / Log[growthRatio(x)]

function productAllocation(
  config: Observable<[Date, Date]>,
  tree: Subtree<CubeSeries>,
  edge: EdgeId
): Observable<ComparisonResult<number>> {
  // mustBeEdgeType(tree, edge, EdgeType.Arithmetic);

  const [x, a] = tree.extremities(edge);

  // get the number of siblings for the "divide by zero" case. otherwise, unnecessary parameter
  const aSiblings = tree.outNeighbors(x).length;

  // mustBeArithmeticOperator(tree, x, "*");

  return config.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxMetricRatio([before, after], tree, x),
        rxMetricRatio([before, after], tree, a, aSiblings)
      ).pipe(
        map(([grat_x, grat_a]) => {
          let value: number | null;

          if (grat_x == null || grat_a == null) {
            value = null;
          } else {
            value = Math.log(grat_a) / Math.log(grat_x);
          }

          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}

// Allocation: division
//
// x = source, b = target
//
// if last child:
//   allocation = Log[growthRatio(a)^-1]
//                ---------------------
//                  Log[growthRatio(x)]
// else
//   allocation = Log[growthRatio(a)]
//                -------------------
//                Log[growthRatio(x)]

function divisionAllocation(
  config: Observable<[Date, Date]>,
  tree: Subtree<CubeSeries>,
  edge: EdgeId
): Observable<ComparisonResult<number>> {
  // mustBeEdgeType(tree, edge, EdgeType.Arithmetic);

  const [x, a] = tree.extremities(edge);

  // mustBeArithmeticOperator(tree, x, "/");

  return config.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxMetricRatio([before, after], tree, x),
        rxMetricRatio([before, after], tree, a)
      ).pipe(
        map(([grat_x, grat_a]) => {
          let value: number | null;

          if (grat_x == null || grat_a == null) {
            value = null;
          } else {
            const [edgeIdx, edgeLen] = edgeIndexByType(
              tree,
              edge,
              EdgeType.Arithmetic
            );
            if (edgeIdx == edgeLen - 1) {
              value = Math.log(1 / grat_a) / Math.log(grat_x);
            } else {
              value = Math.log(grat_a) / Math.log(grat_x);
            }
          }

          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}

// Allocation: segmentation
//
// x --S-- x_a --A-- child_1
//             --A-- child_n
//
// allocation = sum( for each child immediate of x_a:  allocation(child) )
//              ----------------------------------------------------------
//                                   metricChange(x)

function segmentAllocation(
  tree: Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
): Observable<ComparisonResult<number>> {
  // mustBeEdgeType(tree, edge, EdgeType.Segmentation);

  const [x, x_a] = tree.extremities(edge);

  const edgeMap = outboundEdgesByType(tree, x_a, EdgeType.Arithmetic);
  const edgeAttributes = Object.keys(edgeMap);

  return config$.pipe(
    switchMap(([before, after]) => {
      return zip(
        rxMetricChange([before, after], tree, x),
        rxMetricChange([before, after], tree, x_a),
        zip(
          edgeAttributes.map((edge) => rxMetricAllocation(tree, edge, config$))
        )
      ).pipe(
        map(([mc_x, mc_x_a, allocations]) => {
          let value: number | null;
          if (mc_x == null || mc_x_a == null) {
            value = null;
          } else {
            let sum = 0;

            for (const { value: allocation } of allocations) {
              if (allocation == null) {
                value = null;
                break;
              }
              sum += allocation * mc_x_a;
            }

            value = sum / mc_x;
          }

          return { before, after, value, format: ValueFormat.Percent };
        })
      );
    })
  );
}
