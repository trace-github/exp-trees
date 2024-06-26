import * as Arrow from "apache-arrow";
import deepEqual from "fast-deep-equal";
import hash from "object-hash";
import { readParquet } from "parquet-wasm";
import { firstValueFrom } from "rxjs";
import { IResourceReader, ResourceURL } from "../resource";
import { Attribute, Catalog, CubeRequest, CubeTimeGrain } from "../types";
import { ICatalogReader, PathModifer } from "./types";

export const initParquetCatalog = async (
  reader: IResourceReader,
  workspace: string
) => {
  const buffer = await firstValueFrom(
    reader.buffer([workspace, "catalog.parquet"].join("/"))
  );
  const pq = readParquet(new Uint8Array(buffer));
  const table = Arrow.tableFromIPC(pq.intoIPCStream());

  return new ParquetCatalogReader(
    table,
    relativePathModifier(reader.config.root)
  );
};
export class ParquetCatalogReader implements ICatalogReader {
  private readonly catalog: Catalog;
  private readonly pathModifier: PathModifer;
  private readonly cacheCube: Map<string, Promise<ResourceURL>>;

  constructor(catalog: Catalog, pathModifier: PathModifer) {
    this.catalog = catalog;
    this.pathModifier = pathModifier;
    this.cacheCube = new Map();
  }

  // NOTE: Wat. re: undefined `this` when not using arrow function.
  cube = (request: CubeRequest): Promise<ResourceURL> => {
    const requestKey = hash(request);

    if (!this.cacheCube.has(requestKey)) {
      const url = findCubeResource(this.catalog, request);
      if (url == null) throw "Cube not found.";
      const modifiedURL = this.pathModifier(url);
      this.cacheCube.set(requestKey, Promise.resolve(modifiedURL));
    }

    return this.cacheCube.get(requestKey)!;
  };
}
function findCubeResource(
  catalog: Catalog,
  query: {
    metricName: string;
    timeGrain: CubeTimeGrain;
    segment: Attribute[];
  }
) {
  for (let r = 0; r < catalog.numRows; r++) {
    const row = catalog.get(r);
    if (
      row &&
      row.artifact_type == "cube" &&
      row.id == query.metricName &&
      row.time_grain == query.timeGrain &&
      row.segments
        .toJSON()
        .some((segment) => deepEqual(segment?.toJSON(), query.segment))
    ) {
      return row.path;
    }
  }

  return null;
}

function relativePathModifier(root: string): PathModifer {
  return (url: ResourceURL): ResourceURL => {
    if (url.startsWith(root)) return url.slice(root.length);
    return url;
  };
}
