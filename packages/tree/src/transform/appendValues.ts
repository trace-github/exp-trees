import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields
} from "@trace/artifacts";
import { parseISO } from "date-fns";
import { TreeNodeError } from "../node/errors";
import { DateValuePair } from "../types-transform";
import { localToUTC } from "./legacy";

export function appendValues(
  name: string,
  spec: DateValuePair[],
  options: {
    convertSpecToUTC?: boolean;
  } = {}
) {
  const { convertSpecToUTC = false } = options;
  return (target: CubeSeries) => {
    const builder = new CubeSeriesBuilder(
      name,
      readAttributeFields(target.schema)
    );

    // the following two blocks of code are needed to collect all state-value pairs for sorting later. CubeSeries are required to be sorted by start date.
    const startValuePairs: { start: Date; value: number | null }[] = [];
    const starts = new Set<Date>();
    for (let i = 0; i < target.numRows; i++) {
      const row = target.get(i);

      if (row == null) {
        throw TreeNodeError.UnexpectedNullRow;
      }

      startValuePairs.push({ start: row.a.start, value: row.value });
      starts.add(row.a.start);
    }

    for (let i = 0; i < spec.length; i++) {
      const { start: date, value } = spec[i];
      const start = convertSpecToUTC
        ? localToUTC(parseISO(date))
        : parseISO(date);
      if (starts.has(start)) {
        throw TreeNodeError.CubeSeriesDoesNotHaveRequestedRow;
      }
      startValuePairs.push({ start, value });
      starts.add(start);
    }

    // sort the state-value pairs by start date and then add them to builder
    startValuePairs.sort((a, b) => a.start.getTime() - b.start.getTime());
    for (const { start, value } of startValuePairs) {
      builder.add({ start }, null, value);
    }

    return builder.build();
  };
}
