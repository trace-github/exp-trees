import { measure } from "@trace/common";
import { readFile } from "fs/promises";
import { Observable, from, map, shareReplay } from "rxjs";
import { ResourceError } from "../error";
import { FileBackedConfig, IResourceReader, ResourceURL } from "../types";

export class FileBackedReader implements IResourceReader {
  public readonly config: FileBackedConfig;

  private readonly cacheBuffer: Map<ResourceURL, Observable<ArrayBufferLike>>;

  constructor(config: FileBackedConfig) {
    this.config = config;
    this.cacheBuffer = new Map();
  }

  resolve(resource: ResourceURL): ResourceURL {
    return [this.config.root, resource].join("/");
  }

  @measure("FileBackedReader.buffer")
  buffer(resource: ResourceURL): Observable<ArrayBufferLike> {
    if (!this.cacheBuffer.has(resource)) {
      const path = this.resolve(resource);
      const obs = from(readFile(path)).pipe(shareReplay(1));
      this.cacheBuffer.set(resource, obs);
    }

    return this.cacheBuffer.get(resource)!;
  }

  @measure("FileBackedReader.json")
  json<T>(
    resource: ResourceURL,
    check?: (d: unknown) => d is T
  ): Observable<T> {
    const obs = this.buffer(resource).pipe(
      map((buffer) => JSON.parse(buffer.toString())),
      map((json) => {
        if (check) {
          if (!check(json)) throw ResourceError.FailedTypecheck;
          return json;
        }
        return json;
      })
    );

    return obs;
  }
}
