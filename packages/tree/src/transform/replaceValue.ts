import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields
} from "@trace/artifacts";
import { isSameDay, parseISO } from "date-fns";
import { TreeNodeError } from "../node/errors";
import { DateValuePair, SeriesTransformFunction } from "../types-transform";
import { localToUTC } from "./legacy";

export function replaceValue(
  name: string,
  spec: DateValuePair,
  options: {
    convertSpecToUTC?: boolean;
  } = {}
): SeriesTransformFunction {
  const { convertSpecToUTC = false } = options;
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

      const start = convertSpecToUTC
        ? localToUTC(parseISO(spec.start))
        : parseISO(spec.start);

      builder.add(
        row.a,
        row.cnt,
        isSameDay(row.a.start, start) ? spec.value : row.value
      );
    }

    return builder.build();
  };
}
