import { Observable } from "rxjs";
import { Cube, CubeSeries, CubeSlice } from "./schema-artifact";
import { CubeTimeGrain } from "./time-grain";

export type Attribute = string;

export type AttributeValue = string | number | bigint | boolean | Date | null;

export interface CubeRequest {
  metricName: string;
  timeGrain: CubeTimeGrain;
  segment: Attribute[];
}

export interface CubeSliceRequest {
  metricName: string;
  timeGrain: CubeTimeGrain;
  segment: Attribute[];
}

export interface CubeSeriesRequest {
  metricName: string;
  timeGrain: CubeTimeGrain;
  series: { name: Attribute; value?: AttributeValue }[];
}

export interface IArtifactReader {
  cubeShard(request: CubeRequest): Observable<Cube>;
  cubeSlice(request: CubeSliceRequest): Observable<CubeSlice>;
  cubeSeries(request: CubeSeriesRequest): Observable<CubeSeries>;
}
