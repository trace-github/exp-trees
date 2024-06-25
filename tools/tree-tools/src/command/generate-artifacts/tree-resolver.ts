import { CubeSeries, IArtifactReader } from "@trace/artifacts";
import {
  EdgeType,
  IOperatorNode,
  ITreeVisitor,
  NodeType,
  Subtree,
  Tree,
  allocationEdge,
  allocationNormalizedEdge,
  correlationEdge,
  growthRateForEdgeType,
  growthRateNormalizedEdge,
  mixshiftAverageEdge,
  mixshiftMetricChangeFirstEdge,
  mixshiftMetricSegmentChangeFirstEdge,
  resolvingVisitor,
  rxMetric,
  rxOperator
} from "@trace/tree";
import { Observable } from "rxjs";
import { ComparisonEdgeFunc, EdgePredicate } from "./types";

const alwaysTrue: EdgePredicate = () => true;
const onlySourceOperator = (
  mustBeSign?: IOperatorNode<unknown>["operator"]
): EdgePredicate => {
  return (tree, edge) => {
    const sourceAttributes = tree.getSourceAttributes(edge);
    if (sourceAttributes.type != NodeType.Operator) return false;
    if (mustBeSign && sourceAttributes.operator != mustBeSign) return false;
    return true;
  };
};

const ArithmeticComparisons: [EdgePredicate, ComparisonEdgeFunc][] = [
  [alwaysTrue, correlationEdge],
  [alwaysTrue, growthRateForEdgeType[EdgeType.Arithmetic]],
  [alwaysTrue, growthRateNormalizedEdge],
  [alwaysTrue, allocationEdge],
  [alwaysTrue, allocationNormalizedEdge]
];
const SegmentationComparisons: [EdgePredicate, ComparisonEdgeFunc][] = [
  [alwaysTrue, correlationEdge],
  [alwaysTrue, growthRateForEdgeType[EdgeType.Segmentation]],
  [alwaysTrue, growthRateNormalizedEdge],
  [alwaysTrue, allocationEdge],
  [alwaysTrue, allocationNormalizedEdge],
  [onlySourceOperator("/"), mixshiftAverageEdge],
  [onlySourceOperator("/"), mixshiftMetricChangeFirstEdge],
  [onlySourceOperator("/"), mixshiftMetricSegmentChangeFirstEdge]
];

export function resolveTree<T extends Tree<CubeSeries> | Subtree<CubeSeries>>(
  artifacts: IArtifactReader,
  tree: T,
  config$: Observable<[Date, Date]>,
  other: ITreeVisitor<CubeSeries> = {}
): T {
  resolvingVisitor(tree, {
    // NODES
    onMetricNode(tree, node, attributes) {
      const obs = rxMetric(artifacts, tree, node);
      tree.setNodeAttribute(node, "data", obs);
      other?.onMetricNode?.(tree, node, attributes);
    },

    onOperatorNode(tree, node, attributes) {
      const obs = rxOperator(artifacts, tree, node);
      tree.setNodeAttribute(node, "data", obs);
      other?.onOperatorNode?.(tree, node, attributes);
    },

    // EDGES
    onArithmeticEdge(tree, edge, edgeAttributes) {
      const [source, target] = tree.extremities(edge);
      for (const [accept, fn] of ArithmeticComparisons) {
        if (!accept(tree, edge, edgeAttributes)) continue;
        const attributes = fn(tree, edge, config$);
        if (attributes == undefined) continue;
        tree.addDirectedEdge(source, target, attributes);
      }

      other?.onArithmeticEdge?.(tree, edge, edgeAttributes);
    },

    onSegmentationEdge(tree, edge, edgeAttributes) {
      const [source, target] = tree.extremities(edge);
      for (const [accept, fn] of SegmentationComparisons) {
        if (!accept(tree, edge, edgeAttributes)) continue;
        const attributes = fn(tree, edge, config$);
        if (attributes == undefined) continue;
        tree.addDirectedEdge(source, target, attributes);
      }

      other?.onSegmentationEdge?.(tree, edge, edgeAttributes);
    }
  });

  return tree;
}
