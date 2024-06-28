import { CubeTimeGrain } from "@trace/artifacts";
import { SeriesDefinition } from "./series-definition";
import { SeriesTransform } from "./series-transform";
import { Subtree } from "./tree";
import { ValueFormat } from "./values";

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
