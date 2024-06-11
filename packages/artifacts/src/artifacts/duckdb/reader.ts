import { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import * as Arrow from "apache-arrow";
import hash from "object-hash";
import { readParquet } from "parquet-wasm";
import {
  Observable,
  OperatorFunction,
  concatMap,
  firstValueFrom,
  from,
  map,
  of,
  shareReplay,
  zip
} from "rxjs";
import { ICatalogReader } from "../../catalog";
import {
  FileBackedConfig,
  FileBackedReader,
  FileBackedWriter,
  IResourceReader,
  ResourceURL
} from "../../resource";
import { mask, readCubeAttributeNames } from "../../resource/attributes";
import { CubeRequest, CubeSeriesRequest, CubeSliceRequest } from "../../types";
import {
  Cube,
  CubeSchema,
  CubeSeries,
  CubeSlice,
  CubeSliceSchema
} from "../../types-schema";
import { readSchemaFromBuffer } from "../schema";
import { IArtifactReader } from "../types";

export class DuckDBBackedArtifactsReader implements IArtifactReader {
  private readonly db: AsyncDuckDB;
  private readonly remote: IResourceReader;
  private readonly catalog: ICatalogReader;

  private readonly cacheCube: Map<ResourceURL, Observable<Cube>>;
  private readonly cacheCubeSlice: Map<ResourceURL, Observable<CubeSlice>>;
  private readonly cacheCubeSeries: Map<ResourceURL, Observable<CubeSeries>>;

  private readonly cacheReader: FileBackedReader;
  private readonly cacheWriter: FileBackedWriter;

  constructor(
    db: AsyncDuckDB,
    reader: IResourceReader,
    catalog: ICatalogReader,
    fileCacheConfig: FileBackedConfig
  ) {
    this.db = db;
    this.remote = reader;
    this.catalog = catalog;

    this.cacheCube = new Map();
    this.cacheCubeSlice = new Map();
    this.cacheCubeSeries = new Map();

    this.cacheReader = new FileBackedReader(fileCacheConfig);
    this.cacheWriter = new FileBackedWriter(fileCacheConfig);
  }

  cubeShard(request: CubeRequest): Observable<Cube> {
    return of(request).pipe(
      concatMap(this.catalog.cube),
      concatMap((resource) => {
        if (!this.cacheCube.has(resource)) {
          const obs = of(resource).pipe(
            rxBufferFromCache(this.remote, this.cacheReader, this.cacheWriter),
            map((buffer) => {
              const cubeParquet = readParquet(new Uint8Array(buffer));
              const cube = Arrow.tableFromIPC<CubeSchema>(
                cubeParquet.intoIPCStream()
              );
              return cube;
            }),
            shareReplay(1)
          );

          this.cacheCube.set(resource, obs);
        }

        return this.cacheCube.get(resource)!;
      })
    );
  }

  cubeSlice(request: CubeSliceRequest): Observable<CubeSlice> {
    const resource = cubeSliceRequestToResource(request, "parquet");

    if (!this.cacheCubeSlice.has(resource)) {
      const obs = this.cubeShard(request).pipe(
        // Using Duckdb, slice the shard.
        concatMap(async () => {
          const cubeResource = await this.catalog.cube(request);
          const cubeFile = this.cacheReader.resolve(cubeResource);
          const cubeBuffer = await firstValueFrom(
            this.cacheReader.buffer(cubeResource)
          );
          const cubeSchema = await readSchemaFromBuffer(cubeBuffer);
          const cubeMask = mask(
            readCubeAttributeNames(cubeSchema),
            request.segment
          );
          const cubeSliceAttributeSQL = `struct_pack(${request.segment
            .map((curr) => `${curr} := a.${curr}`)
            .join(",")})`;
          const cubeSliceSQL = `
            select
              ${cubeSliceAttributeSQL} as a,
              cnt,
              name,
              value
            from read_parquet('${cubeFile}')
            where a_mask = ${cubeMask}
            order by a.start asc`;

          let conn: AsyncDuckDBConnection | undefined;
          try {
            conn = await this.db.connect();
            const cubeSlice = await conn.query<CubeSliceSchema>(cubeSliceSQL);
            return cubeSlice;
          } finally {
            conn?.close();
          }
        }),

        // write to FS
        // concatMap(async (cubeSlice) => {
        //   await this.cacheWriter.writeBuffer(
        //     resource,
        //     writeParquet(Table.fromIPCStream(Arrow.tableToIPC(cubeSlice)))
        //   );
        //   return cubeSlice;
        // }),
        shareReplay(1)
      );

      this.cacheCubeSlice.set(resource, obs);
    }

    return this.cacheCubeSlice.get(resource)!;
  }

  cubeSeries(request: CubeSeriesRequest): Promise<CubeSeries> {
    throw new Error("Method not implemented.");
  }
}

function rxBufferFromCache(
  remote: IResourceReader,
  cacheReader: FileBackedReader,
  cacheWriter: FileBackedWriter
): OperatorFunction<ResourceURL, ArrayBufferLike> {
  return (obs) =>
    obs.pipe(
      concatMap((resource) => {
        return zip([of(resource), from(cacheWriter.exists(resource))]);
      }),
      concatMap(([resource, exists]) => {
        if (exists) {
          return cacheReader.buffer(resource);
        } else {
          return zip([of(resource), remote.buffer(resource)]).pipe(
            concatMap(async ([resource, buffer]) => {
              await cacheWriter.writeBuffer(resource, buffer);
              return buffer;
            })
          );
        }
      })
    );
}

function cubeSliceRequestToResource(
  request: CubeSliceRequest,
  ext: string = "parquet"
): ResourceURL {
  const url = [
    "cubeSlice$",
    request.metricName,
    request.timeGrain,
    `${hash(request)}.${ext}`
  ].join("/");

  return url;
}
