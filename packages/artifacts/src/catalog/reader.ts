import * as Arrow from "apache-arrow";
import deepEqual from "fast-deep-equal";
import hash from "object-hash";
import { readParquet } from "parquet-wasm";
import { Observable, firstValueFrom, of } from "rxjs";
import { IResourceReader, ResourceURL } from "../resource";
import { Attribute, CubeRequest, CubeTimeGrain } from "../types";
import { Catalog } from "../types-schema";
import { ICatalogReader, PathModifer } from "./types";

export async function initParquetCatalog(
  reader: IResourceReader,
  workspace: string
) {
  const buffer = await firstValueFrom(
    reader.buffer([workspace, "catalog.parquet"].join("/"))
  );
  const pq = readParquet(new Uint8Array(buffer));
  const table = Arrow.tableFromIPC(pq.intoIPCStream());

  return ParquetCatalogReader.withRelativeRoot(table, reader.config.root);
}
export class ParquetCatalogReader implements ICatalogReader {
  private readonly catalog: Catalog;
  private readonly pathModifier: PathModifer;
  private readonly cacheCube: Map<string, Observable<ResourceURL>>;

  private constructor(catalog: Catalog, pathModifier: PathModifer) {
    this.catalog = catalog;
    this.pathModifier = pathModifier;
  }

  cube(request: CubeRequest): Observable<ResourceURL> {
    const requestKey = hash(request);
    if (!this.cacheCube.has(requestKey)) {
      const url = findCubeResource(this.catalog, request);

      if (url == null) throw "Cube not found.";

      const modifiedURL = this.pathModifier(url);

      this.cacheCube.set(requestKey, of(modifiedURL));
    }

    return this.cacheCube.get(requestKey)!;
  }

  public static async withRelativeRoot(
    catalog: Catalog,
    root: string
  ): Promise<ParquetCatalogReader> {
    return new ParquetCatalogReader(catalog, relativePathModifier(root));
  }
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
