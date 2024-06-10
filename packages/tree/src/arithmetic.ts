import { MultiDirectedGraph } from "graphology";
import { traverseEdgeBreadthFirst } from "./traversal";
import { rootNode } from "./tree";
import { ArithmeticTree, EdgeType, NodeId, Subtree, Tree } from "./types";

/**
 * Returns a copy of the "base" tree of any valid tree config.
 *
 * If no segemtnation has been peformed, base tree is a copy of the input tree.
 *
 * @param tree
 * @returns a copy of the "base" tree
 */
export function arithmeticTree<T>(
  tree: Tree<T> | Subtree<T>,
  node: NodeId = rootNode(tree)
): ArithmeticTree<T> {
  const arithTree: ArithmeticTree<T> = new MultiDirectedGraph();

  const arithNodes = [
    ...traverseEdgeBreadthFirst(tree, node, [EdgeType.Arithmetic])
  ];

  for (const curr of arithNodes) {
    const attributes = tree.getNodeAttributes(curr);
    arithTree.addNode(curr, attributes);
  }

  tree.forEachOutboundEdge(
    (
      edge,
      attributes,
      source,
      target,
      _sourceAttributes,
      _targetAttributes,
      undirected
    ) => {
      if (!arithNodes.includes(source)) return;
      if (undirected) return;
      if (attributes.type != EdgeType.Arithmetic) return;
      arithTree.addDirectedEdgeWithKey(edge, source, target, attributes);
    }
  );

  return arithTree;
}
