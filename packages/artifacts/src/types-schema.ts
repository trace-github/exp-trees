import * as Arrow from "apache-arrow";

/** ARTIFACTS **/

export interface AttributeStruct {
  start: Arrow.DateDay;
  [key: string | symbol]: Arrow.Utf8 | Arrow.Bool | Arrow.Int | Arrow.DateDay;
}

export type CubeSchema = {
  name: Arrow.Utf8;
  a: Arrow.Struct<AttributeStruct>;
  a_mask: Arrow.Int;
  cnt: Arrow.Int;
  value: Arrow.Float;
};

export type Cube = Arrow.Table<CubeSchema>;

export type CubeSliceSchema = Omit<CubeSchema, "a_mask">;
export type CubeSlice = Arrow.Table<CubeSliceSchema>;

export type CubeSeriesSchema = Omit<CubeSchema, "a_mask">;
export type CubeSeries = Arrow.Table<CubeSeriesSchema>;

/** CATALOG **/

export type CatalogSchema = {
  id: Arrow.Utf8;
  artifact_type: Arrow.Utf8;
  time_grain: Arrow.Utf8;
  segments: Arrow.List<Arrow.List<Arrow.Utf8>>;
  path: Arrow.Utf8;
};

export type Catalog = Arrow.Table<CatalogSchema>;
