/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  MonoTypeOperatorFunction,
  Observable,
  concatMap,
  firstValueFrom,
  map,
  of,
  shareReplay,
} from "rxjs";
import { fetchArrayBuffer, fetchJSON } from "../fetch";
import { pathJoin } from "../path";
import {
  GoogleCloudStorageConfig,
  IResourceReader,
  ResourceURL,
} from "../types";
import { signer } from "./signing";

export class GoogleCloudResourceReader implements IResourceReader {
  private readonly signer: (url: ResourceURL) => Promise<string>;
  private readonly bucket: string;

  private readonly cacheBuffer: Map<ResourceURL, Observable<ArrayBufferLike>>;
  private readonly cacheJSON: Map<ResourceURL, Observable<any>>;

  constructor(config: GoogleCloudStorageConfig) {
    this.signer = signer(config);
    this.bucket = config.root;

    this.cacheBuffer = new Map();
    this.cacheJSON = new Map();
  }

  buffer(resource: ResourceURL): Promise<ArrayBufferLike> {
    if (!this.cacheBuffer.has(resource)) {
      const obs = of(resource).pipe(
        fix__rxResolveAbsoluteLocation(this.bucket),
        concatMap(async (resource) => {
          const signedResource = await this.signer(resource);
          const buffer = await fetchArrayBuffer(signedResource);
          return buffer;
        }),
        shareReplay(1)
      );

      this.cacheBuffer.set(resource, obs);
    }

    return firstValueFrom(this.cacheBuffer.get(resource)!);
  }

  json<T = any>(
    resource: ResourceURL,
    check?: ((d: unknown) => d is T) | undefined
  ): Promise<T> {
    if (!this.cacheBuffer.has(resource)) {
      const obs = of(resource).pipe(
        fix__rxResolveAbsoluteLocation(this.bucket),
        concatMap(async (resource) => {
          const signedResource = await this.signer(resource);
          const json = await fetchJSON(signedResource, check);
          return json;
        }),
        shareReplay(1)
      );

      this.cacheJSON.set(resource, obs);
    }

    return firstValueFrom(this.cacheJSON.get(resource)!);
  }
}

function fix__rxResolveAbsoluteLocation(
  bucket: string
): MonoTypeOperatorFunction<ResourceURL> {
  return (obs) =>
    obs.pipe(
      map((resource) => {
        if (resource.startsWith(bucket)) {
          resource = resource.slice(bucket.length);
        }
        return pathJoin(bucket, resource.replace(/^\/|\/$/g, ""));
      })
    );
}
