import { CubeSeries } from "@trace/artifacts";
import Graph from "graphology";
import { subgraph } from "graphology-operators";
import { bfsFromNode } from "graphology-traversal";
import { AnalysisError } from "./analysis";
import { TreeError } from "./errors";
import {
  AnalysisEdge,
  AnalysisType,
  EdgeId,
  EdgeType,
  NodeId,
  NodeType,
  Subtree,
  Tree,
  TreeEdge,
  TreeEdgeType,
  TreeNode,
  TreeNodeType
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
 *
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
 * Gets a node by type from the tree.
 * @param tree The tree to search within.
 * @param mustBeType The type the node must be.
 * @returns The node if found and of the correct type, otherwise undefined.
 */
export function nodesByType<U extends NodeType>(
  tree: Subtree<CubeSeries>,
  mustBeType: U
): Record<NodeId, Extract<TreeNodeType<CubeSeries>, { type: U }>> {
  const nodes: Record<
    NodeId,
    Extract<TreeNodeType<CubeSeries>, { type: U }>
  > = {};

  tree.forEachNode((node, attributes) => {
    if (attributes.type === mustBeType) {
      nodes[node] = attributes as Extract<
        TreeNodeType<CubeSeries>,
        { type: U }
      >;
    }
  });

  return nodes;
}

/**
 * Gets all edges of a specific type in the tree.
 *
 * @param tree The tree to search within.
 * @param type The type of edges to retrieve.
 * @returns A dictionary of edge IDs to edge attributes.
 */
export function edgesByType<T, U extends EdgeType>(
  tree: Subtree<T>,
  type: U
): Record<EdgeId, Extract<TreeEdge, { type: U }>> {
  const edges: Record<EdgeId, Extract<TreeEdge, { type: U }>> = {};

  tree.forEachOutEdge((edge, attributes) => {
    if (attributes.type === type) {
      edges[edge] = attributes as Extract<TreeEdge, { type: U }>;
    }
  });

  return edges;
}

/**
 * Gets outbound edges of a specific type from a node in the tree.
 *
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

export function hasOutboundEdgeOfType<T, U extends EdgeType>(
  tree: Subtree<T>,
  node: NodeId,
  mustBeOfType: U
): boolean {
  return Object.keys(outboundEdgesByType(tree, node, mustBeOfType)).length > 0;
}

/**
 * Gets inbound edges of a specific type from a node in the tree.
 *
 * @param tree The tree to search within.
 * @param node The ID of the node to get edges from.
 * @param type The type of edges to retrieve.
 * @returns A dictionary of edge IDs to edge attributes.
 */
export function inboundEdgesByType<T, U extends EdgeType>(
  tree: Subtree<T>,
  node: NodeId,
  type: U
): Record<EdgeId, Extract<TreeEdge, { type: U }>> {
  const inboundEdges: Record<EdgeId, Extract<TreeEdge, { type: U }>> = {};

  tree.forEachInboundEdge(node, (edge, attributes) => {
    if (attributes.type === type) {
      inboundEdges[edge] = attributes as Extract<TreeEdge, { type: U }>;
    }
  });

  return inboundEdges;
}

export function inboundAnalysisEdgesByType<T, U extends AnalysisType>(
  tree: Subtree<T>,
  node: NodeId,
  analysis: U
) {
  const inboundEdges = inboundEdgesByType(tree, node, EdgeType.Analysis);
  const inboundAnalysisEdges: Record<
    EdgeId,
    Extract<AnalysisEdge, { type: EdgeType.Analysis; analysis: U }>
  > = {};

  Object.entries(inboundEdges).reduce((acc, [edge, attributes]) => {
    if (attributes.analysis != analysis) return acc;
    acc[edge] = attributes as Extract<
      AnalysisEdge,
      { type: EdgeType.Analysis; analysis: U }
    >;
    return acc;
  }, inboundAnalysisEdges);

  return inboundAnalysisEdges;
}

export function inboundAnalysisEdgeByType<T, U extends AnalysisType>(
  tree: Subtree<T>,
  node: NodeId,
  analysis: U
):
  | [EdgeId, Extract<AnalysisEdge, { type: EdgeType.Analysis; analysis: U }>]
  | undefined {
  const analysisEdgeMap = inboundAnalysisEdgesByType(tree, node, analysis);
  const analysisEdges = Object.entries(analysisEdgeMap);

  if (analysisEdges.length > 1) {
    throw TreeError.TooManyEdges;
  }

  return analysisEdges.at(0);
}

export function edgeIndexByType(
  tree: Tree<unknown>,
  edge: EdgeId,
  type: EdgeType
) {
  const [source] = tree.extremities(edge);
  const edges = Object.keys(outboundEdgesByType(tree, source, type));
  return [edges.indexOf(edge), edges.length];
}

export function isEdgeType<T, U extends EdgeType>(
  attributes: TreeEdgeType<T>,
  mustBeType: U
): attributes is TreeEdgeType<T, U> {
  return attributes.type == mustBeType;
}

export function oneOfEdgeType<T>(
  attributes: TreeEdgeType<T>,
  mustBeOneOf: EdgeType[]
): boolean {
  return mustBeOneOf.includes(attributes.type);
}

export function edgePath<T>(
  tree: Subtree<T>,
  start: NodeId,
  end: NodeId,
  accept: (edge: EdgeId, attributes: TreeEdge) => boolean = () => false
) {
  const path: EdgeId[] = [];
  let head = end;
  do {
    const edges = tree.filterInEdges(
      head,
      (edge, attributes, _source, target) => {
        if (target != head) return false;
        return accept(edge, attributes);
      }
    );

    if (edges.length != 1) AnalysisError.UnexpectedEdgeType;

    const edge = edges[0];

    path.push(edge);

    const [source] = tree.extremities(edge);

    head = source;
  } while (head != start);

  return path.reverse();
}
