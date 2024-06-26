import { NodeId } from "../types";

export enum AnalysisOutputType {
  NodeSheet = "node-sheet",
  ComparisonTable = "comparison-table"
}

export interface NodeSheetOutput {
  type: AnalysisOutputType.NodeSheet;
  root?: NodeId;
  options: {
    maxDepth?: number;
  };
}

export interface ComparisonTableOutput {
  type: AnalysisOutputType.ComparisonTable;
  root?: NodeId;
  date1: Date;
  date2: Date;
  options?: {
    maxDepth?: number;
  };
}

export type AnalysisOutput = NodeSheetOutput | ComparisonTableOutput;
