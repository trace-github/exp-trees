import {
  ArithmeticEdge,
  EdgeId,
  NodeId,
  NodeType,
  RelatedEdge,
  SegmentationEdge,
  Subtree,
  Tree,
  TreeNodeType,
} from "../types";

export interface ITreeVisitor<T> {
  onMetricNode?(
    tree: Tree<T> | Subtree<T>,
    node: NodeId,
    attributes: TreeNodeType<T, NodeType.Metric>,
  ): void;

  onOperatorNode?(
    tree: Tree<T> | Subtree<T>,
    node: NodeId,
    attributes: TreeNodeType<T, NodeType.Operator>,
  ): void;

  onFormulaNode?(
    tree: Tree<T> | Subtree<T>,
    node: NodeId,
    attributes: TreeNodeType<T, NodeType.Formula>,
  ): void;

  onArithmeticEdge?(tree: Tree<T> | Subtree<T>, edge: EdgeId, attributes: ArithmeticEdge): void;

  onSegmentationEdge?(tree: Tree<T> | Subtree<T>, edge: EdgeId, attributes: SegmentationEdge): void;

  onRelatedEdge?(tree: Tree<T> | Subtree<T>, edge: EdgeId, attributes: RelatedEdge): void;
}
