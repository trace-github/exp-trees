import { Observable } from "rxjs";
import { SegmentDefinition } from "./series-definition";
import { Subtree } from "./tree";
import { ValueFormat } from "./values";

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

export type AnalysisEdge = { type: EdgeType.Analysis } & (
  | AllocationAnalysis
  | AllocationNormalizedAnalysis
  | GrowthRateAnalysis
  | GrowthRateNormalizedAnalysis
  | CorrelationAnalysis
  | MixshiftMetricChangeFirstAnalysis
  | MixshiftSegmentChangeFirstAnalysis
  | MixshiftAverageAnalysis
);

export type TreeEdge =
  | AnalysisEdge
  | ArithmeticEdge
  | RelatedEdge
  | SegmentationEdge;

export type TreeEdgeType<T, U extends EdgeType = any> = Extract<
  ReturnType<Subtree<T>["getEdgeAttributes"]>,
  { type: U }
>;
