import * as Arrow from "apache-arrow";

export type CatalogSchema = {
  id: Arrow.Utf8;
  artifact_type: Arrow.Utf8;
  time_grain: Arrow.Utf8;
  segments: Arrow.List<Arrow.List<Arrow.Utf8>>;
  path: Arrow.Utf8;
};

export type Catalog = Arrow.Table<CatalogSchema>;
