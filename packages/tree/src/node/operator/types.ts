import { CubeSeries } from "@trace/artifacts";
import { NodeId, SeriesModifier } from "../../types";

export type OperatorInput = {
  modifiers?: SeriesModifier;
  node: NodeId;
  series: CubeSeries;
};
