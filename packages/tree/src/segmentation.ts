import { MultiDirectedGraph } from "graphology";
import { traverseEdgeBreadthFirst } from "./traversal";
import { rootNode } from "./tree";
import { EdgeType, NodeId, SegmentationTree, Subtree, Tree } from "./types";

/**
 * Returns a copy of the "base" tree of any valid tree config.
 *
 * If no segemtnation has been peformed, base tree is a copy of the input tree.
 *
 * @param tree
 * @returns a copy of the "base" tree
 */
export function segmentationTree<T>(
  tree: Tree<T> | Subtree<T>,
  node: NodeId = rootNode(tree)
): SegmentationTree<T> {
  const segmentationTree: SegmentationTree<T> = new MultiDirectedGraph();

  const segmentationNodes = [
    ...traverseEdgeBreadthFirst(tree, node, [EdgeType.Segmentation])
  ];

  for (const curr of segmentationNodes) {
    const attributes = tree.getNodeAttributes(curr);
    segmentationTree.addNode(curr, attributes);
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
      if (undirected) return;
      if (attributes.type != EdgeType.Segmentation) return;
      if (!segmentationNodes.includes(source)) return;
      if (!segmentationNodes.includes(target)) return;

      segmentationTree.addDirectedEdgeWithKey(edge, source, target, attributes);
    }
  );

  return segmentationTree;
}
