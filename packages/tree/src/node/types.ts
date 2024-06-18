import { CubeSeries } from "@trace/artifacts";

export type EvaluateInput = {
  name: string;
  expression: string;
  inputs: { [key: string]: CubeSeries };
};
