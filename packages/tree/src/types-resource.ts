import { CubeTimeGrain, ResourceURL } from "@trace/artifacts";
import { TreeConfig } from "./types";

export type TreeResourceId = string;

export interface TreeResource {
  readonly id: TreeResourceId;
  readonly name: string;
  readonly path: ResourceURL;
}

export interface TreeListResponse {
  id: string;
  name: string;
  timeGrain: CubeTimeGrain[];
}

export interface TreeResponse {
  config: TreeConfig;
}

export interface ITreeClient {
  list(id?: TreeResourceId): Promise<TreeListResponse[]>;
  tree<T>(id: TreeResourceId, timeGrain: CubeTimeGrain): Promise<TreeResponse>;
}
