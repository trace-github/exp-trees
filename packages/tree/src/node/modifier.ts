import {
  CubeSeries,
  CubeSeriesBuilder,
  readAttributeFields,
  readAttributeStartDates,
  readName
} from "@trace/artifacts";
import { findIndexForEqualDate } from "@trace/common";
import { MonoTypeOperatorFunction, map } from "rxjs";
import { TreeNodeError } from "./errors";

export function rxCubeSeriesEnsureDates(
  dates: Date[]
): MonoTypeOperatorFunction<CubeSeries> {
  return (obs) => {
    return obs.pipe(map((series) => ensureCubeSeriesDates(series, dates)));
  };
}

function ensureCubeSeriesDates(
  series: CubeSeries,
  dates: Date[],
  name: string = readName(series)
) {
  const aFields = readAttributeFields(series.schema);
  const builder = new CubeSeriesBuilder(name, aFields);
  const firstRow = series.get(0);
  const starts = readAttributeStartDates(series);

  if (firstRow == null) {
    // If input series has no rows, return a series with no rows.
    return builder.build();
  }

  for (const start of dates) {
    const rowIdx = findIndexForEqualDate(starts, start);

    switch (rowIdx) {
      case -1:
        // Date not found in input series. Add null value.
        builder.add({ ...firstRow.a.toJSON(), start }, null, null);
        break;

      default: {
        const row = series.get(rowIdx);
        if (!row) {
          throw TreeNodeError.CubeSeriesDoesNotHaveRequestedRow;
        }

        builder.add(row.a, row.cnt, row.value);
      }
    }
  }

  const result = builder.build();

  return result;
}

export function rxReplaceNullValues(
  replacementValue: number | null,
  replacementName?: string
): MonoTypeOperatorFunction<CubeSeries> {
  return (obs) =>
    obs.pipe(
      map((input) =>
        replaceNullValues(input, replacementValue, replacementName)
      )
    );
}

function replaceNullValues(
  series: CubeSeries,
  value: number | null,
  name: string = readName(series)
): CubeSeries {
  const attributeFields = readAttributeFields(series.schema);
  const builder = new CubeSeriesBuilder(name, attributeFields);

  for (let r = 0; r < series.numRows; r++) {
    const row = series.get(r);

    if (row == null) continue;

    if (row.value == null) {
      row.value = value;
    }

    builder.add(row.a, row.cnt, row.value);
  }

  const result = builder.build();

  return result;
}
