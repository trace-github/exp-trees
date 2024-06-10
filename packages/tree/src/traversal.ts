import {
  NodeId,
  Subtree,
  Tree,
  TreeEdgeType,
  TreeNodePredicate
} from "./types";

/**
 * Performs a Breadth-First Search (BFS) on a tree or subtree, following only
 * specified edge types, and yields nodes that satisfy the given predicate.
 *
 * @param tree - The tree or subtree to traverse.
 * @param node - The starting node ID for BFS traversal.
 * @param edgeType - Array of edge types to follow during traversal.
 * @param accept - A predicate function to determine whether to include a node
 *                 in the traversal. Defaults to a function that accepts all nodes.
 * @yields Node IDs in the order they are visited during BFS traversal.
 */
export function* traverseEdgeBreadthFirst<T>(
  tree: Tree<T> | Subtree<T>,
  node: NodeId,
  edgeType: TreeEdgeType<T>["type"][],
  accept: TreeNodePredicate<T> = () => true
): Generator<NodeId> {
  const visited = new Set<NodeId>();
  const queue: NodeId[] = [node];

  while (queue.length > 0) {
    const node = queue.shift();

    if (!node) continue;
    if (visited.has(node)) continue;

    visited.add(node);

    const attributes = tree.getNodeAttributes(node);
    if (accept(tree, node, attributes)) {
      yield node;
    }

    tree.forEachOutboundEdge(
      node,
      (
        _edge: string,
        attributes,
        _source,
        target,
        _sourceAttributes,
        _targetAttributes,
        _undirected
      ) => {
        if (edgeType.includes(attributes.type) && !visited.has(target)) {
          queue.push(target);
        }
      }
    );
  }
}
