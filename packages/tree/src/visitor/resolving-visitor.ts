import { topologicalSort } from "graphology-dag";
import { bfsFromNode } from "graphology-traversal";
import { arithmeticTree } from "../arithmetic";
import { segmentationTree } from "../segmentation";
import { rootNode, subtree } from "../tree";
import { EdgeType, NodeId, NodeType, Subtree, Tree } from "../types";
import { TreeVisitorError } from "./errors";
import { ITreeVisitor } from "./types";

/**
 * Visits nodes/edges of a given tree based on a custom, resolution-specific
 * traversal order.
 *
 * - Evaluate Segmentation subtrees TOP-DOWN (custom, above-fold first).
 * - Evaluate Arithmetic subtrees BOTTOM-UP (topological, due to data dependencies).
 * - Evaluate Related subtrees LAST
 *
 * @param tree The tree or subtree to be resolved.
 * @param visitor The visitor for handling specific node and edge types.
 */
export function resolvingVisitor<T>(
  tree: Tree<T> | Subtree<T>,
  visitor: ITreeVisitor<T>
): void {
  const segments = segmentationTree(tree);
  const segmentsRoot = rootNode(segments);

  bfsFromNode(segments, segmentsRoot, (node) => {
    resolveArithmeticTreeVisitor(tree, node, visitor);

    segments.forEachInboundEdge(node, (edge, attributes) => {
      visitor.onSegmentationEdge?.(tree, edge, attributes);
    });
  });

  // Finally, resolve other types of edges + nodes
  tree.forEachDirectedEdge((edge, attributes, _source, target) => {
    switch (attributes.type) {
      case EdgeType.Analysis:
        // ignore
        break;

      case EdgeType.Arithmetic:
      case EdgeType.Segmentation:
        // Ignore. Already visited.
        break;

      case EdgeType.Related: {
        const related = subtree(tree, target);
        resolvingVisitor(related, visitor);
        visitor.onRelatedEdge?.(tree, edge, attributes);
        break;
      }

      default:
        throw TreeVisitorError.newUnexpectedEdgeError(edge);
    }
  });
}

/**
 * Resolves an arithmetic subtree by traversing its nodes in (reverse)
 * topological order to ensure correct processing of dependencies.
 *
 * NOTE: Our edges are the "reverse" of what a regular dependency graph would
 * have.
 *
 * @param tree The arithmetic subtree to be resolved.
 * @param visitor The visitor for handling specific node and edge types.
 */
function resolveArithmeticTreeVisitor<T>(
  tree: Subtree<T>,
  node: NodeId,
  visitor: ITreeVisitor<T>
) {
  const arithmetic = arithmeticTree(tree, node);

  const topo = topologicalSort(arithmetic);
  for (const node of topo.reverse()) {
    const attributes = tree.getNodeAttributes(node);

    switch (attributes.type) {
      case NodeType.Metric:
        visitor.onMetricNode?.(tree, node, attributes);
        break;

      case NodeType.Formula:
        visitor.onFormulaNode?.(tree, node, attributes);
        break;

      case NodeType.Operator:
        visitor.onOperatorNode?.(tree, node, attributes);
        break;

      default:
        throw TreeVisitorError.newUnexpectedNodeError(node);
    }

    tree.forEachOutboundEdge(node, (edge, attributes) => {
      switch (attributes.type) {
        case EdgeType.Arithmetic:
          visitor.onArithmeticEdge?.(tree, edge, attributes);
      }
    });
  }
}
