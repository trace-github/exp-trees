import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields
} from "@trace/artifacts";

import { TreeNodeError } from "../node/errors";
import { ReplaceAllValues, SeriesTransformFunction } from "../types-transform";

export function replaceAllValues(
  name: string,
  spec: ReplaceAllValues
): SeriesTransformFunction {
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

      builder.add(row.a, row.cnt, spec.value);
    }

    const result = builder.build();

    return result;
  };
}
