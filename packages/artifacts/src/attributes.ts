import * as Arrow from "apache-arrow";
import { ArtifactError } from "./errors";
import {
  Attribute,
  CubeSchema,
  CubeSeriesSchema,
  CubeSliceSchema
} from "./types";

/**
 * Computes a bitmask based on the difference between the definition and
 * segment arrays.
 *
 * @param definition - An array of attributes that defines the bitmask.
 * @param segment - An array of attributes to compare against the definition.
 * @returns A bitmask indicating which attributes from the definition are not
 * present in the segment.
 */
export function computeAttributeMask(
  definition: Attribute[],
  segment: Attribute[]
): number {
  let m = 0;
  definition.forEach((attr, index) => {
    if (!segment.includes(attr)) {
      m |= 1 << (definition.length - index - 1);
    }
  });
  return m;
}

/**
 * Reads the start dates from the attribute column ("a") in an Apache Arrow
 * table.
 *
 * @param table - The Apache Arrow table containing the attribute column.
 * @returns An array of start dates.
 */
export function readAttributeStartDates(
  table: Arrow.Table<CubeSchema | CubeSliceSchema | CubeSeriesSchema>
) {
  const attributes = table.getChild("a");
  if (!attributes) return [];

  const starts: Date[] = [];
  const rows = table.getChild("a")?.toArray() ?? [];
  for (const row of rows) {
    starts.push(row.start);
  }

  return starts;
}

/**
 * Reads the fields of the attribute column ("a") in a schema.
 *
 * @param schema - The schema of the Cube, CubeSlice, or CubeSeries.
 * @returns An array of fields in the attribute column.
 * @throws An error if the attribute column is not found or is not a struct.
 */
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

/**
 * Reads the names of the fields in the attribute column ("a") in a schema.
 *
 * @param schema - The schema of the Cube, CubeSlice, or CubeSeries.
 * @returns An array of field names in the attribute column.
 */
export function readAttributeNames(
  schema:
    | Arrow.Schema<CubeSchema>
    | Arrow.Schema<CubeSliceSchema>
    | Arrow.Schema<CubeSeriesSchema>
) {
  return readAttributeFields(schema).map(({ name }) => name);
}

/**
 * Reads the name from the first row of an Apache Arrow table.
 *
 * @param table - The Apache Arrow table containing the data.
 * @returns The name from the first row, or "NO-NAME" if the table is empty.
 */
export function readName(
  table:
    | Arrow.Table<CubeSchema>
    | Arrow.Table<CubeSliceSchema>
    | Arrow.Table<CubeSeriesSchema>
): string {
  const firstRow = table.get(0);
  if (firstRow == null) {
    throw ArtifactError.UnexpectedEmptyTable;
  }

  return firstRow.name;
}
