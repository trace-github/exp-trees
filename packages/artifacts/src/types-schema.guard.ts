import * as Arrow from "apache-arrow";
import {
  CatalogSchema,
  Cube,
  CubeSchema,
  CubeSeries,
  CubeSlice,
} from "./types-schema";

const CUBE_SCHEMA: Arrow.Schema<CubeSchema> = new Arrow.Schema([
  new Arrow.Field("cnt", new Arrow.Int(true, 32), true),
  new Arrow.Field("name", new Arrow.Utf8(), true),
  new Arrow.Field("value", new Arrow.Float(Arrow.Precision.DOUBLE), true),
  new Arrow.Field("a_mask", new Arrow.Int(true, 32), true),

  // NOTE: since we don't know the struct's inner type apriori, we
  // can not use a straight Arrow schema comparison.
  new Arrow.Field("a", new Arrow.Struct([]), true),
]);

/**
 * Checks if a given Apache Arrow table conforms to the Cube schema.
 * This function first compares a subset of expected schema fields against the
 * actual table's schema to ensure structural consistency. It then verifies if
 * the 'a' field in the table schema is a struct, as required.
 *
 * @param {Arrow.Table} table - The Apache Arrow table to check.
 * @returns {boolean} Returns true if the table matches the Cube schema, false
 * otherwise.
 */
export function isCube(table: Arrow.Table): table is Cube {
  const expected = CUBE_SCHEMA.select(["cnt", "name", "value", "a_mask"]);
  const actual = table.schema.select(["cnt", "name", "value", "a_mask"]);
  const schemaOk = Arrow.util.compareSchemas(expected, actual);

  if (!schemaOk) return false;

  const attributeField = table.schema.select(["a"]).fields.at(0);
  const attributeFieldOk = Arrow.DataType.isStruct(attributeField);

  return attributeFieldOk;
}

const CUBESLICE_SCHEMA: Arrow.Schema<CubeSchema> = new Arrow.Schema([
  new Arrow.Field("cnt", new Arrow.Int(true, 64), false),
  new Arrow.Field("name", new Arrow.Utf8(), false),
  new Arrow.Field("value", new Arrow.Float(Arrow.Precision.DOUBLE), false),
  new Arrow.Field("a", new Arrow.Struct([]), false),
]);

export function isCubeSlice(table: Arrow.Table): table is CubeSlice {
  const expected = CUBESLICE_SCHEMA.select(["cnt", "name", "value"]);
  const actual = table.schema.select(["cnt", "name", "value"]);

  for (const name of expected.names) {
    const expectedField = expected.fields.find((field) => field.name == name);
    const actualField = actual.fields.find((field) => field.name == name);

    if (
      !expectedField ||
      !actualField ||
      !Arrow.util.compareFields(expectedField, actualField)
    ) {
      return false;
    }
  }

  const attributeField = table.schema.select(["a"]).fields.at(0);
  const attributeFieldOk = Arrow.DataType.isStruct(attributeField);

  if (!attributeFieldOk) return false;

  // CubeSlice specific: does not contain an a_mask;
  const schemaLengthOk =
    table.schema.fields.length == CUBESLICE_SCHEMA.fields.length;

  return schemaLengthOk;
}

export function isCubeSeries(table: Arrow.Table): table is CubeSeries {
  const sliceOk = isCubeSlice(table);

  if (!sliceOk) return false;

  // TODO: CubeSeries specific: `a.start` is unique.

  return true;
}

/** CATALOG **/

const CATALOG_SCHEMA: Arrow.Schema<CatalogSchema> = new Arrow.Schema([
  new Arrow.Field("id", new Arrow.Utf8(), false),
  new Arrow.Field("artifact_type", new Arrow.Utf8(), false),
  new Arrow.Field("time_grain", new Arrow.Utf8(), false),
  new Arrow.Field(
    "segments",
    new Arrow.List(
      new Arrow.Field(
        "element",
        new Arrow.List(new Arrow.Field("element", new Arrow.Utf8(), true)),
        true
      )
    ),
    false
  ),
  new Arrow.Field("path", new Arrow.Utf8(), false),
]);

export function isCatalog(
  table: Arrow.Table
): table is Arrow.Table<CatalogSchema> {
  const VALIDATE_FIELDS: (keyof CatalogSchema)[] = [
    "id",
    "artifact_type",
    "time_grain",
    "segments",
    "path",
  ];

  const expected = CATALOG_SCHEMA.select(VALIDATE_FIELDS);
  const actual = table.schema.select(VALIDATE_FIELDS);

  const schemaOk = Arrow.util.compareSchemas(expected, actual);

  return schemaOk;
}
