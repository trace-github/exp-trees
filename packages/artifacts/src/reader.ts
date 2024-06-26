import { AsyncDuckDB, AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import { measure } from "@trace/common";
import * as Arrow from "apache-arrow";
import hash from "object-hash";
import { Table, readParquet, writeParquet } from "parquet-wasm";
import {
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  concatMap,
  firstValueFrom,
  from,
  map,
  mergeMap,
  of,
  shareReplay,
  zip
} from "rxjs";
import { computeAttributeMask, readAttributeNames } from "./attributes";
import { ICatalogReader } from "./catalog";
import {
  FileBackedConfig,
  FileBackedReader,
  FileBackedWriter,
  IResourceReader,
  ResourceURL
} from "./resource";
import {
  Cube,
  CubeRequest,
  CubeSchema,
  CubeSeries,
  CubeSeriesRequest,
  CubeSeriesSchema,
  CubeSlice,
  CubeSliceRequest,
  CubeSliceSchema,
  IArtifactReader
} from "./types";
import { readSchemaFromBuffer } from "./utils/parquet";

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

  @measure("DuckDBBackedArtifactsReader.cubeShard")
  cubeShard(request: CubeRequest): Observable<Cube> {
    return of(request).pipe(
      concatMap((request) => this.catalog.cube(request)),
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

  @measure("DuckDBBackedArtifactsReader.cubeSlice")
  cubeSlice(request: CubeSliceRequest): Observable<CubeSlice> {
    const resource = cubeSliceRequestToResource(request, "parquet");

    if (!this.cacheCubeSlice.has(resource)) {
      const cacheFileExists = this.cacheWriter.exists(resource);

      let obs: Observable<CubeSlice>;
      if (!cacheFileExists) {
        obs = of(request).pipe(
          // Ensure that the cube shard is downloaded.
          rxEnsureAction((request) => this.cubeShard(request)),

          // Compute the slice.
          rxGenerateCubeSlice(this.db, this.catalog, this.cacheReader),

          // Write the result to file.
          concatMap(async (cubeSlice) => {
            const cubeSliceBuffer = writeParquet(
              Table.fromIPCStream(Arrow.tableToIPC(cubeSlice))
            );
            await this.cacheWriter.writeBuffer(resource, cubeSliceBuffer);
            return cubeSlice;
          }),

          // New requesters get the last result.
          shareReplay(1)
        );
      } else {
        obs = readArrowFile<CubeSliceSchema>(this.cacheReader, resource);
      }

      this.cacheCubeSlice.set(resource, obs);
    }

    return this.cacheCubeSlice.get(resource)!;
  }

  @measure("DuckDBBackedArtifactsReader.cubeSeries")
  cubeSeries(request: CubeSeriesRequest): Observable<CubeSeries> {
    const resource = cubeSeriesRequestToResource(request, "parquet");
    if (!this.cacheCubeSeries.has(resource)) {
      const obs = of(request).pipe(
        // Ensure that the cube shard is downloaded
        mergeMap((request) =>
          this.cubeSlice({
            metricName: request.metricName,
            timeGrain: request.timeGrain,
            segment: request.series.map(({ name }) => name)
          }).pipe(map(() => request))
        ),
        rxGenerateCubeSeries(this.db, this.cacheReader)
      );

      this.cacheCubeSeries.set(resource, obs);
    }

    return this.cacheCubeSeries.get(resource)!;
  }
}

function rxEnsureAction<T>(
  action: (args: T) => unknown | Promise<unknown> | Observable<unknown>
): MonoTypeOperatorFunction<T> {
  return (source: Observable<T>) =>
    source.pipe(
      mergeMap((value) => {
        const result = action(value);

        let obs: Observable<void>;
        if (result instanceof Promise) {
          obs = from(result);
        } else if (result instanceof Observable) {
          obs = result;
        } else {
          obs = of(undefined);
        }

        return obs.pipe(map(() => value));
      })
    );
}

function rxBufferFromCache(
  remote: IResourceReader,
  cacheReader: FileBackedReader,
  cacheWriter: FileBackedWriter
): OperatorFunction<ResourceURL, ArrayBufferLike> {
  return (obs) =>
    obs.pipe(
      concatMap((resource) => {
        const exists = cacheWriter.exists(resource);

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

function readArrowFile<T extends Arrow.TypeMap = any>(
  reader: FileBackedReader,
  resource: ResourceURL
): Observable<Arrow.Table<T>> {
  return of(resource).pipe(
    concatMap((resource) => reader.buffer(resource)),
    concatMap(async (cubeSliceBuffer) => {
      const pq = readParquet(new Uint8Array(cubeSliceBuffer));
      const table = Arrow.tableFromIPC<T>(pq.intoIPCStream());
      return table;
    })
  );
}

function cubeSeriesRequestToResource(
  request: CubeSeriesRequest,
  ext: string = "parquet"
): ResourceURL {
  const url = [
    "cubeSeries$",
    request.metricName,
    request.timeGrain,
    `${hash(request)}.${ext}`
  ].join("/");

  return url;
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

function rxGenerateCubeSeries(
  db: AsyncDuckDB,
  fsReader: FileBackedReader
): OperatorFunction<CubeSeriesRequest, CubeSeries> {
  return (obs) =>
    obs.pipe(
      concatMap(async (request) => {
        const cubeSliceResource = cubeSliceRequestToResource({
          metricName: request.metricName,
          segment: request.series.map(({ name }) => name),
          timeGrain: request.timeGrain
        });
        const cubeSliceFile = fsReader.resolve(cubeSliceResource);

        const cubeSeriesCondition = request.series
          .reduce(
            (acc, { name, value }) => {
              if (value == undefined) return acc;

              switch (typeof value) {
                case "boolean":
                case "number":
                case "bigint":
                  acc.push(`a.${name} = ${value}`);
                  break;

                case "object":
                  if (value == null) {
                    acc.push(`a.${name} is NULL`);
                    break;
                  }
                  throw "Unexpected value type";

                case "string":
                case "symbol":
                  acc.push(`a.${name} = '${value.toString()}'`);
                  break;

                default:
                  throw "Unexpected value type";
              }

              return acc;
            },
            ["1 = 1"] as string[]
          )
          .join(" AND ");
        const cubeSeriesSQL = `
          select 
            * 
          from read_parquet('${cubeSliceFile}') 
          where ${cubeSeriesCondition}
        `;

        let conn: AsyncDuckDBConnection | undefined;
        try {
          conn = await db.connect();
          const table = await conn.query<CubeSeriesSchema>(cubeSeriesSQL);
          return table;
        } finally {
          await conn?.close();
        }
      })
    );
}

function rxGenerateCubeSlice(
  db: AsyncDuckDB,
  catalog: ICatalogReader,
  fsReader: FileBackedReader
): OperatorFunction<CubeSliceRequest, CubeSlice> {
  return (obs) =>
    obs.pipe(
      concatMap(async (request) => {
        const cubeResource = await catalog.cube(request);
        const cubeFile = fsReader.resolve(cubeResource);
        const cubeBuffer = await firstValueFrom(fsReader.buffer(cubeResource));

        const cubeSchema = await readSchemaFromBuffer(cubeBuffer);
        const cubeMask = computeAttributeMask(
          readAttributeNames(cubeSchema),
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
          conn = await db.connect();
          const cubeSlice = await conn.query<CubeSliceSchema>(cubeSliceSQL);
          return cubeSlice;
        } finally {
          await conn?.close();
        }
      })
    );
}
