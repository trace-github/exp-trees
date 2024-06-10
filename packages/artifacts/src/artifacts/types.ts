import { CubeRequest, CubeSeriesRequest, CubeSliceRequest } from "../types";
import { Cube, CubeSeries, CubeSlice } from "../types-schema";

export interface IArtifactReader {
  cubeShard(request: CubeRequest): Promise<Cube>;
  cubeSlice(request: CubeSliceRequest): Promise<CubeSlice>;
  cubeSeries(request: CubeSeriesRequest): Promise<CubeSeries>;
}