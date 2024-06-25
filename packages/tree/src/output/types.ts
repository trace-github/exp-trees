import { NodeId } from "../types";

export enum AnalysisOutputType {
  NodeSheet = "node-sheet",
  ComparisonTable = "comparison-table"
}

export interface NodeSheetOutput {
  type: AnalysisOutputType.NodeSheet;
  root: NodeId | undefined;
  options: {
    maxDepth?: number;
  };
}

export interface ComparisonTableOutput {
  type: AnalysisOutputType.ComparisonTable;
  root: NodeId | undefined;
  date1: Date;
  date2: Date;
  options: {};
}

export type AnalysisOutput = NodeSheetOutput | ComparisonTableOutput;
