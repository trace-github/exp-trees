import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields,
  startOfTimeGrain
} from "@trace/artifacts";
import { TreeNodeError } from "../node/errors";
import { SeriesTransformFunction, Timeshift } from "../types/series-transform";

export function timeShift(
  name: string,
  spec: Timeshift
): SeriesTransformFunction {
  return (target: CubeSeries) => {
    const { step, unit } = spec;

    const builder = new CubeSeriesBuilder(
      name,
      readAttributeFields(target.schema)
    );
    for (let i = 0; i < target.numRows; i++) {
      const curr = target.get(i);

      if (!curr) throw TreeNodeError.UnexpectedNullRow;

      const date = curr.a.start;
      const shifted = startOfTimeGrain(date, unit, { offset: step });

      builder.add({ start: shifted }, curr.cnt, curr.value);
    }

    const result = builder.build();

    return result;
  };
}
