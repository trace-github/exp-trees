import { Attribute, AttributeValue, CubeTimeGrain } from "@trace/artifacts";
import { MultiDirectedGraph } from "graphology";
import { Attributes } from "graphology-types";
import { Observable } from "rxjs";

export enum ValueFormat {
  Unknown = "unknown",
  Decimal = "decimal",
  Integer = "integer",
  Percent = "percent",
  Currency = "currency"
}

/** Series **/

/** @see {isFixedSegmentDefinition} ts-auto-guard:type-guard */
export type FixedSegmentDefinition = {
  name: "start";
};

export type SegmentDefinition = {
  name: Attribute;
  value: AttributeValue;
};

export type SeriesDefinition = (FixedSegmentDefinition | SegmentDefinition)[];

/** Transform **/

export enum SeriesTransformType {
  Filter = "filter",
  ReplaceValue = "replaceValue",
  Timeshift = "timeshift",
  AppendValues = "appendValues",
  ReplaceAllValues = "replaceAllValues",
  NegateValues = "negateValues"
}

export type SeriesTransform = { type: SeriesTransformType.Timeshift }[];

/** Nodes **/

export type NodeId = string;

export enum NodeType {
  Metric = "metric",
  Operator = "operator",
  Formula = "formula"
}

interface BaseNode<T> {
  readonly type: NodeType;
  readonly metricName: string;

  label: string;
  format: ValueFormat;
  isIncreaseDesired: boolean;
  transform?: SeriesTransform;

  data?: T;
}

export interface IMetricNode<T> extends BaseNode<T> {
  readonly type: NodeType.Metric;
  readonly timeGrain: CubeTimeGrain;
  series: SeriesDefinition;
}

export interface IFormulaNode<T> extends BaseNode<T> {
  readonly type: NodeType.Formula;
  readonly expression: string;
  readonly timeGrain: CubeTimeGrain;

  series: SeriesDefinition;
}

export type ArithmeticOperator = "+" | "-" | "*" | "/";

export interface IOperatorNode<T> extends BaseNode<T> {
  readonly type: NodeType.Operator;
  readonly operator: ArithmeticOperator;
}

export type TreeNode<T> = IMetricNode<T> | IOperatorNode<T> | IFormulaNode<T>;

export type TreeNodeType<T, U extends NodeType = any> = Extract<
  ReturnType<Subtree<T>["getNodeAttributes"]>,
  { type: U }
>;

/** Edge **/

export type EdgeId = string;

export enum EdgeType {
  Arithmetic = "arithmetic",
  Segmentation = "segmentation",
  Analysis = "analysis",
  Related = "related"
}

export enum SeriesFillType {
  None = "NONE",
  FillDown = "FILL_DOWN"
}

export type SeriesModifier = {
  fill?: SeriesFillType;
  ifNull?: number | null;
};

export type ArithmeticEdge = {
  readonly type: EdgeType.Arithmetic;
  modifiers?: SeriesModifier;
};

export type SegmentationEdge = {
  readonly type: EdgeType.Segmentation;
  readonly segment?: SegmentDefinition[];
};

export type AnalysisEdge = {
  readonly type: EdgeType.Analysis;
};

export type RelatedEdge = {
  readonly type: EdgeType.Related;
};

export type TreeEdge =
  | ArithmeticEdge
  | SegmentationEdge
  | AnalysisEdge
  | RelatedEdge;

export type TreeEdgeType<T, U extends EdgeType = any> = Extract<
  ReturnType<Subtree<T>["getEdgeAttributes"]>,
  { type: U }
>;

/** Tree **/

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
