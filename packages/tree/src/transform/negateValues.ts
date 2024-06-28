import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields
} from "@trace/artifacts";
// import { CubeSeries } from "@trace/artifacts-2";
import { TreeNodeError } from "../node/errors";
import { SeriesTransformFunction } from "../types/series-transform";

export function negateValues(name: string): SeriesTransformFunction {
  return (target: CubeSeries) => {
    const builder = new CubeSeriesBuilder(
      name,
      readAttributeFields(target.schema)
    );

    for (let i = 0; i < target.numRows; i++) {
      const row = target.get(i);
      if (!row) {
        throw TreeNodeError.UnexpectedNullRow;
      }

      builder.add(row.a, row.cnt, row.value == null ? null : -1 * row.value);
    }

    const result = builder.build();

    return result;
  };
}
