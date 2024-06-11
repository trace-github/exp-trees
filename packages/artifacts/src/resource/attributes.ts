import * as Arrow from "apache-arrow";
import { Attribute } from "../types";
import { CubeSchema, CubeSeriesSchema, CubeSliceSchema } from "../types-schema";

export function mask(definition: Attribute[], segment: Attribute[]): number {
  let m = 0;

  definition.forEach((attr, index) => {
    if (!segment.includes(attr)) {
      m |= 1 << (definition.length - index - 1);
    }
  });

  return m;
}

export function readCubeAttributeFields(
  schema:
    | Arrow.Schema<CubeSchema>
    | Arrow.Schema<CubeSliceSchema>
    | Arrow.Schema<CubeSeriesSchema>
) {
  const attributeField = schema.fields.find(({ name }) => name == "a");

  if (!attributeField) throw "Unexpected schema";

  const fieldType = attributeField.type;

  if (!Arrow.DataType.isStruct(fieldType)) throw "Unexpected schema";

  return fieldType.children;
}

export function readCubeAttributeNames(
  schema:
    | Arrow.Schema<CubeSchema>
    | Arrow.Schema<CubeSliceSchema>
    | Arrow.Schema<CubeSeriesSchema>
) {
  return readCubeAttributeFields(schema).map(({ name }) => name);
}
