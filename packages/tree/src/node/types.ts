import { CubeSeries } from "@trace/artifacts";

export type EvaluateInput = {
  name: string;
  // dates: Date[];
  expression: string;
  inputs: { [key: string]: CubeSeries };
};
