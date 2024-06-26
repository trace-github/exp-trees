import * as Arrow from "apache-arrow";
import { CatalogSchema } from "./schema-catalog";

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
  new Arrow.Field("path", new Arrow.Utf8(), false)
]);

export function isCatalog(
  table: Arrow.Table
): table is Arrow.Table<CatalogSchema> {
  const VALIDATE_FIELDS: (keyof CatalogSchema)[] = [
    "id",
    "artifact_type",
    "time_grain",
    "segments",
    "path"
  ];

  const expected = CATALOG_SCHEMA.select(VALIDATE_FIELDS);
  const actual = table.schema.select(VALIDATE_FIELDS);

  const schemaOk = Arrow.util.compareSchemas(expected, actual);

  return schemaOk;
}
