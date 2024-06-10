import { Observable } from "rxjs";
import { ResourceURL } from "../resource";
import { CubeRequest } from "../types";

export type PathModifer = (resource: ResourceURL) => ResourceURL;

export interface ICatalogReader {
  cube(request: CubeRequest): Observable<ResourceURL>;
}
