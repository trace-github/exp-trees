import { Observable } from "rxjs";
import { CubeRequest, CubeSeriesRequest, CubeSliceRequest } from "../types";
import { Cube, CubeSeries, CubeSlice } from "../types-schema";

export interface IArtifactReader {
  cubeShard(request: CubeRequest): Observable<Cube>;
  cubeSlice(request: CubeSliceRequest): Observable<CubeSlice>;
  cubeSeries(request: CubeSeriesRequest): Promise<CubeSeries>;
}
