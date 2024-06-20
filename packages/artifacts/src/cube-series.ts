import { findIndexForEqualDate } from "@trace/common";
import * as Arrow from "apache-arrow";
import { compareAsc } from "date-fns";
import { readAttributeStartDates } from "./attributes";
import { Attribute, AttributeValue } from "./types";
import { AttributeStruct, CubeSeries, CubeSeriesSchema } from "./types-schema";

export class CubeSeriesBuilder {
  private readonly nameBuilder: Arrow.Utf8Builder;
  private readonly attributeBuilder: Arrow.StructBuilder;
  private readonly countBuilder: Arrow.Int32Builder;
  private readonly valueBuilder: Arrow.FloatBuilder;

  private readonly name: string | undefined;

  constructor(
    name: string,
    attributeFields: Arrow.Field<AttributeStruct[keyof AttributeStruct]>[]
  ) {
    this.attributeBuilder = Arrow.makeBuilder({
      type: new Arrow.Struct(attributeFields)
    });
    this.countBuilder = Arrow.makeBuilder({
      type: new Arrow.Int32(),
      nullValues: [null, undefined]
    });
    this.nameBuilder = Arrow.makeBuilder({
      type: new Arrow.Utf8(),
      nullValues: [null, undefined]
    });
    this.valueBuilder = Arrow.makeBuilder({
      type: new Arrow.Float(Arrow.Precision.DOUBLE),
      nullValues: [null]
    });

    this.name = name;
  }

  public add(
    a: { start: Date; [key: string]: unknown },
    cnt: bigint | number | null,
    value: bigint | number | null
  ): void {
    this.nameBuilder.append(this.name);

    this.attributeBuilder.append(a);

    if (cnt == null) {
      this.countBuilder.append(null);
    } else {
      this.countBuilder.append(Number(cnt));
    }

    if (value == null) {
      this.valueBuilder.append(null);
    } else {
      this.valueBuilder.append(Number(value)); // ?
    }
  }

  public build(): CubeSeries {
    return new Arrow.Table<CubeSeriesSchema>({
      a: this.attributeBuilder.toVector(),
      cnt: this.countBuilder.toVector(),
      name: this.nameBuilder.toVector(),
      value: this.valueBuilder.toVector()
    });
  }
}

export function cubeSeriesFromArrays(
  name: string,
  dates: Date[],
  values: (number | null)[],
  otherAttributes: { [key: Attribute]: AttributeValue } = {}
): CubeSeries {
  if (dates.length != values.length) {
    throw "Dates array length must equal values array length.";
  }

  const attributeBuilder = Arrow.makeBuilder({
    type: new Arrow.Struct([
      new Arrow.Field("start", new Arrow.DateDay(), true)
    ])
  });
  const countBuilder = Arrow.makeBuilder({
    type: new Arrow.Int32(),
    nullValues: [null, undefined]
  });
  const nameBuilder = Arrow.makeBuilder({
    type: new Arrow.Utf8(),
    nullValues: [null, undefined]
  });
  const valueBuilder = Arrow.makeBuilder({
    type: new Arrow.Float(Arrow.Precision.DOUBLE),
    nullValues: [null]
  });

  for (let r = 0; r < dates.length; r++) {
    const start = dates[r];
    const value = values[r];

    attributeBuilder.append({ ...otherAttributes, start });
    countBuilder.append(null);
    nameBuilder.append(name);
    valueBuilder.append(value);
  }

  return new Arrow.Table<CubeSeriesSchema>({
    a: attributeBuilder.toVector(),
    cnt: countBuilder.toVector(),
    name: nameBuilder.toVector(),
    value: valueBuilder.toVector()
  });
}

/**
 * Finds the value in a CubeSeries for a specified date.
 *
 * @param series - The CubeSeries object which contains the data. The dates in
 * the series should be sorted in ascending order.
 * @param target - The target date for which to find the corresponding value
 * in the series.
 * @returns The value associated with the target date in the CubeSeries, or
 * `null` if the date is not found.
 */
export function findCubeSeriesValueAtDate(series: CubeSeries, target: Date) {
  // CubeSeries dates should be sorted ASC
  const starts = readAttributeStartDates(series);
  const idx = findIndexForEqualDate(starts.sort(compareAsc), target);

  if (idx == -1) return null;

  const row = series.get(idx);

  if (row == null) return null;

  if (row.value == null) return null;

  return Number(row.value);
}
