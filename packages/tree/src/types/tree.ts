import { MultiDirectedGraph } from "graphology";
import { Attributes } from "graphology-types";
import { Observable } from "rxjs";
import { ArithmeticEdge, SegmentationEdge, TreeEdge } from "./tree-edge";
import { NodeId, TreeNode, TreeNodeType } from "./tree-node";

export type MaybeResolvable<T> = T extends never
  ? never
  : Observable<T> | undefined;

export type TreeInfo = {
  name: string;
  timeGrain: string;
  [key: string]: unknown;
};

export type Tree<T, U extends Attributes = TreeInfo> = MultiDirectedGraph<
  TreeNode<MaybeResolvable<T>>,
  TreeEdge,
  U
>;

export type Subtree<T> = Tree<T, any>;

export type ArithmeticTree<T> = MultiDirectedGraph<
  TreeNode<MaybeResolvable<T>>,
  ArithmeticEdge
>;

export type SegmentationTree<T> = MultiDirectedGraph<
  TreeNode<MaybeResolvable<T>>,
  SegmentationEdge
>;

export type TreeConfig = Tree<undefined>;

/** Tree Predicates **/

export type TreeNodePredicate<T> = (
  tree: Tree<T> | Subtree<T>,
  node: NodeId,
  attributes: TreeNodeType<T>,
  depth?: number
) => boolean;
