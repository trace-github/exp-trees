import * as Arrow from "apache-arrow";

export interface AttributeStruct {
  start: Arrow.DateDay;
  [key: string | symbol]: Arrow.Utf8 | Arrow.Bool | Arrow.Int | Arrow.DateDay;
}

export type CubeSchema = {
  name: Arrow.Utf8;
  a: Arrow.Struct<AttributeStruct>;
  a_mask: Arrow.Int;
  cnt: Arrow.Int | Arrow.Null;
  value: Arrow.Float | Arrow.Null;
};
export type Cube = Arrow.Table<CubeSchema>;

export type CubeSliceSchema = Omit<CubeSchema, "a_mask">;
export type CubeSlice = Arrow.Table<CubeSliceSchema>;

export type CubeSeriesSchema = Omit<CubeSchema, "a_mask">;
export type CubeSeries = Arrow.Table<CubeSeriesSchema>;
