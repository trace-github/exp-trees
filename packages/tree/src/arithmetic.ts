import { MultiDirectedGraph } from "graphology";
import { bfsFromNode } from "graphology-traversal";
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

/**
 * Retrieves children of a specified node in an arithmetic tree using BFS.
 *
 * @template T - The type of the data stored in the tree nodes.
 * @param {Tree<T> | Subtree<T>} tree - The tree or subtree to traverse.
 * @param {NodeId} root - The root node from which to start the traversal.
 * @param {object} [options] - Optional parameters.
 * @param {number} [options.maxDepth=Infinity] - The maximum depth to traverse.
 * @param {boolean} [options.excludeRoot=true] - Whether to exclude the root node.
 * @returns {NodeId[]} An array of node IDs representing the children of the root.
 */
export function arithmeticChildren<T = unknown>(
  tree: Tree<T> | Subtree<T>,
  root: NodeId,
  options: { maxDepth?: number; excludeRoot?: boolean } = {}
): NodeId[] {
  const { maxDepth = Infinity, excludeRoot = false } = options;

  const target = arithmeticTree(tree, root);
  const nodes: NodeId[] = [];
  bfsFromNode(target, root, (node, _, depth) => {
    if (node == root && excludeRoot) {
      return false;
    }

    nodes.push(node);

    return depth >= maxDepth;
  });

  return nodes;
}
