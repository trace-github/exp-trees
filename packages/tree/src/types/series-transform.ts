/** Transform **/

import { CubeSeries, TimeGrain } from "@trace/artifacts";

export enum SeriesTransformType {
  Filter = "filter",
  ReplaceValue = "replaceValue",
  Timeshift = "timeshift",
  AppendValues = "appendValues",
  ReplaceAllValues = "replaceAllValues",
  NegateValues = "negateValues"
}

export type Timeshift = {
  step: number;
  unit: TimeGrain;
};

export type DateValuePair = {
  start: string; // ISO date
  value: number;
};

export type ReplaceAllValues = {
  value: number;
};

export type SeriesTransform = (
  | {
      type: SeriesTransformType.Timeshift;
      spec: Timeshift;
    }
  | {
      type: SeriesTransformType.ReplaceValue;
      spec: DateValuePair;
    }
  | {
      type: SeriesTransformType.AppendValues;
      spec: DateValuePair[];
    }
  | {
      type: SeriesTransformType.ReplaceAllValues;
      spec: { value: number };
    }
  | {
      type: SeriesTransformType.NegateValues;
    }
)[];

export type SeriesTransformFunction = (
  series: CubeSeries
) => CubeSeries | Promise<CubeSeries>;
