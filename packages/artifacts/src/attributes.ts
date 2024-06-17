import * as Arrow from "apache-arrow";
import { Attribute } from "./types";
import { CubeSchema, CubeSeriesSchema, CubeSliceSchema } from "./types-schema";

export function mask(definition: Attribute[], segment: Attribute[]): number {
  let m = 0;
  definition.forEach((attr, index) => {
    if (!segment.includes(attr)) {
      m |= 1 << (definition.length - index - 1);
    }
  });
  return m;
}

export function readAttributeStartDates(
  table: Arrow.Table<CubeSchema | CubeSliceSchema | CubeSeriesSchema>
) {
  const attributes = table.getChild("a");
  if (!attributes) return [];

  const rows = table.getChild("a")?.toArray() ?? [];

  const starts: Date[] = [];
  for (const row of rows) {
    starts.push(row.start);
  }

  return starts;
}

export function readAttributeFields(
  schema:
    | Arrow.Schema<CubeSchema>
    | Arrow.Schema<CubeSliceSchema>
    | Arrow.Schema<CubeSeriesSchema>
) {
  const attributeField = schema.fields.find(({ name }) => name == "a");

  if (!attributeField) throw "Unexpected schema: No attribute column";

  const fieldType = attributeField.type;

  if (!Arrow.DataType.isStruct(fieldType))
    throw "Unexpected schema: Attribute is not a struct";

  return fieldType.children;
}

export function readAttributeNames(
  schema:
    | Arrow.Schema<CubeSchema>
    | Arrow.Schema<CubeSliceSchema>
    | Arrow.Schema<CubeSeriesSchema>
) {
  return readAttributeFields(schema).map(({ name }) => name);
}

export function readName(
  table:
    | Arrow.Table<CubeSchema>
    | Arrow.Table<CubeSliceSchema>
    | Arrow.Table<CubeSeriesSchema>
): string {
  const firstRow = table.get(0);
  // throw "Cannot extract `name` from empty Cube*";
  if (firstRow == null) return "NO-NAME";
  return firstRow.name;
}
