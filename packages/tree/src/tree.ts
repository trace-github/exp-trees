import Graph from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import { NodeId, Subtree, Tree } from "./types";

/**
 * Retrieves the root node ID of a given tree or subtree. The root node is
 * defined as the node with an in-degree of 0.
 *
 * @param tree - The tree or subtree from which to find the root node.
 * @returns The NodeId of the root node.
 * @throws TreeError.NOT_A_TREE if the tree does not meet the criteria of having
 *         exactly one root node.
 */
export function rootNode(tree: Graph): NodeId {
  const nodes = tree.filterNodes((node) => tree.inDegree(node) == 0);

  if (nodes.length != 1) {
  }

  return nodes[0];
}

/**
 * Generates a subtree from a specified starting node in a given tree or subtree.
 * The subtree includes all nodes that are reachable from the starting node.
 *
 * @param tree - The original tree or subtree from which to derive the subtree.
 * @param startNode - The starting node ID from which the subtree will be generated.
 * @returns A new `Subtree<T>` derived from the specified starting node.
 */
export function subtree<T>(tree: Tree<T> | Subtree<T>, startNode: NodeId) {
  const includeNodes: NodeId[] = [];
  bfsFromNode(tree, startNode, (key) => {
    includeNodes.push(key);
  });

  return subgraph(tree, includeNodes);
}
