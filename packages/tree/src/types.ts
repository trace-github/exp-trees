import { Attribute, AttributeValue, CubeTimeGrain } from "@trace/artifacts";
import { MultiDirectedGraph } from "graphology";
import { Attributes } from "graphology-types";
import { Observable } from "rxjs";
import { SeriesTransform } from "./types-transform";

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

export type RelatedEdge = {
  readonly type: EdgeType.Related;
};

// ANALYSIS

/** @see {isAllocationAnalysisType} ts-auto-guard:type-guard */
export enum AllocationAnalysisType {
  Allocation = "allocation",
  AllocationNormalized = "allocation-normalized"
}

/** @see {isGrowthRateAnalysisType} ts-auto-guard:type-guard */
export enum GrowthRateAnalysisType {
  GrowthRate = "growth-rate",
  GrowthRateNormalized = "growth-rate-normalized"
}

/** @see {isCorrelationAnalysisType} ts-auto-guard:type-guard */
export enum CorrelationAnalysisType {
  Correlation = "correlation"
}

/** @see {isMixshiftAnalysisType} */
export enum MixshiftAnalysisType {
  MixshiftMetricChangeFirst = "mixshift-metric-change-first",
  MixshiftSegmentChangeFirst = "mixshift-segment-change-first",
  MixshiftAverage = "mixshift-average"
}

export type AnalysisType =
  | AllocationAnalysisType
  | GrowthRateAnalysisType
  | CorrelationAnalysisType
  | MixshiftAnalysisType;

export type AnalysisState = [
  AllocationAnalysisType | GrowthRateAnalysisType | CorrelationAnalysisType,
  MixshiftAnalysisType | null
];

export interface Analysis<T extends AnalysisType, U> {
  analysis: T;
  data: Observable<U>;
}

export type ComparisonResult<T> = {
  readonly before: Date;
  readonly after: Date;
  readonly value: T | null;
  readonly format: ValueFormat;
};

export type MixshiftResult = {
  type:
    | MixshiftAnalysisType.MixshiftMetricChangeFirst
    | MixshiftAnalysisType.MixshiftSegmentChangeFirst
    | MixshiftAnalysisType.MixshiftAverage;
  allocation: number;
  dueToMetric: number;
  dueToVolume: number;
};

export type AllocationAnalysis = Analysis<
  AllocationAnalysisType.Allocation,
  ComparisonResult<number>
>;

export type AllocationNormalizedAnalysis = Analysis<
  AllocationAnalysisType.AllocationNormalized,
  ComparisonResult<number>
>;

export type GrowthRateAnalysis = Analysis<
  GrowthRateAnalysisType.GrowthRate,
  ComparisonResult<number>
>;

export type GrowthRateNormalizedAnalysis = Analysis<
  GrowthRateAnalysisType.GrowthRateNormalized,
  ComparisonResult<number>
>;

export type CorrelationAnalysis = Analysis<
  CorrelationAnalysisType.Correlation,
  ComparisonResult<number>
>;

export type MixshiftMetricChangeFirstAnalysis = Analysis<
  MixshiftAnalysisType.MixshiftMetricChangeFirst,
  ComparisonResult<MixshiftResult>
>;

export type MixshiftSegmentChangeFirstAnalysis = Analysis<
  MixshiftAnalysisType.MixshiftSegmentChangeFirst,
  ComparisonResult<MixshiftResult>
>;

export type MixshiftAverageAnalysis = Analysis<
  MixshiftAnalysisType.MixshiftAverage,
  ComparisonResult<MixshiftResult>
>;

export type AnalysisEdge<A extends Analysis<AnalysisType, unknown>> = {
  readonly type: EdgeType.Analysis;
} & A;

export type TreeEdge =
  | AnalysisEdge<
      | AllocationAnalysis
      | AllocationNormalizedAnalysis
      | GrowthRateAnalysis
      | GrowthRateNormalizedAnalysis
      | CorrelationAnalysis
      | MixshiftMetricChangeFirstAnalysis
      | MixshiftSegmentChangeFirstAnalysis
      | MixshiftAverageAnalysis
    >
  | ArithmeticEdge
  | RelatedEdge
  | SegmentationEdge;

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
