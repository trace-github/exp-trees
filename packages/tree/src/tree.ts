import Graph from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import {
  EdgeId,
  EdgeType,
  NodeId,
  NodeType,
  Subtree,
  Tree,
  TreeEdge,
  TreeNode
} from "./types";

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

/**
 * Gets a node by type from the tree.
 * @param tree The tree to search within.
 * @param node The ID of the node to retrieve.
 * @param mustBeType The type the node must be.
 * @returns The node if found and of the correct type, otherwise undefined.
 */
export function nodeByType<T, U extends NodeType>(
  tree: Subtree<T>,
  node: NodeId,
  mustBeType: U
): (TreeNode<T> & { type: U }) | undefined {
  if (!tree.hasNode(node)) {
    return undefined;
  }

  const attributes = tree.getNodeAttributes(node);
  if (attributes.type !== mustBeType) {
    throw new Error(`Node is not of type '${mustBeType}'.`);
  }

  return attributes as TreeNode<T> & { type: U };
}

/**
 * Gets outbound edges of a specific type from a node in the tree.
 * @param tree The tree to search within.
 * @param node The ID of the node to get edges from.
 * @param type The type of edges to retrieve.
 * @returns A dictionary of edge IDs to edge attributes.
 */
export function outboundEdgesByType<T, U extends EdgeType>(
  tree: Subtree<T>,
  node: NodeId,
  type: U
): Record<EdgeId, Extract<TreeEdge, { type: U }>> {
  const outboundEdges: Record<EdgeId, Extract<TreeEdge, { type: U }>> = {};

  tree.forEachOutEdge(node, (edge, attributes) => {
    if (attributes.type === type) {
      outboundEdges[edge] = attributes as Extract<TreeEdge, { type: U }>;
    }
  });

  return outboundEdges;
}
