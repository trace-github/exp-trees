import * as Arrow from "apache-arrow";
import { isBefore, isEqual } from "date-fns";
import {
  readAttributeFields,
  readAttributeStartDates,
  readName
} from "./attributes";
import { AttributeStruct, CubeSeries, CubeSeriesSchema } from "./types-schema";

export function findIndexForEqualDate(sortedDates: Date[], dateToFind: Date) {
  let left = 0;
  let right = sortedDates.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleDate = sortedDates[middle];

    if (isEqual(middleDate, dateToFind)) {
      return middle;
    }

    if (isBefore(middleDate, dateToFind)) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}

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
    row: ReturnType<Arrow.StructRow<CubeSeriesSchema>["toJSON"]> | null
  ): void {
    if (row == null) return;

    this.attributeBuilder.append(row.a.toJSON());

    if (row.cnt == null) {
      this.countBuilder.append(null);
    } else {
      this.countBuilder.append(Number(row.cnt));
    }

    this.nameBuilder.append(this.name);

    if (row.value == null) {
      this.valueBuilder.append(null);
    } else {
      this.valueBuilder.append(Number(row.value)); // ?
    }
  }

  public add2(
    a: { start: Date; [key: string]: any },
    cnt: number | null,
    value: number | null
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

export function ensureDates(
  target: CubeSeries,
  dates: Date[],
  name: string = readName(target)
) {
  const builder = new CubeSeriesBuilder(
    name,
    readAttributeFields(target.schema)
  );
  const firstRow = target.get(0);

  const starts = readAttributeStartDates(target);

  if (firstRow == null) return builder.build();

  for (const start of dates) {
    const rowIdx = findIndexForEqualDate(starts, start);

    if (rowIdx == -1) {
      builder.add2({ ...firstRow.a.toJSON(), start }, null, null);
    } else {
      const row = target.get(rowIdx);

      if (!row) throw "x";

      builder.add({
        a: row.a,
        cnt: row.cnt,
        name: row.name,
        value: row.value
      });
    }
  }

  const series = builder.build();

  return series;
}

export function replaceNullValue(
  target: CubeSeries,
  value: number,
  name: string = readName(target)
): CubeSeries {
  const builder = new CubeSeriesBuilder(
    name,
    readAttributeFields(target.schema)
  );

  for (let r = 0; r < target.numRows; r++) {
    const row = target.get(r);
    if (row == null) continue;
    if (row.value == null) row.value = value;
    builder.add(row);
  }

  return builder.build();
}

export function operatorSeries(
  name: string,
  dates: Date[],
  values: (number | null)[]
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

    attributeBuilder.append({ start });
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

export function cubeSeriesTable(series: CubeSeries): Arrow.Table {
  const json: { [key: string]: any }[] = [];

  for (let r = 0; r < series.numRows; r++) {
    const row = series.get(r);
    json.push({ start: row?.a.start, value: row?.value });
  }
  return Arrow.tableFromJSON(json);
}
