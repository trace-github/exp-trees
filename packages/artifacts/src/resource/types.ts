import { Observable } from "rxjs";

export type ResourceURL = string;

export enum BackendType {
  GCS = "gs",
  HTTP = "http",
  HTTPS = "https",
  File = "file"
}

export interface IResourceReader {
  readonly config: ResourceConfig;

  resolve(location: ResourceURL): ResourceURL;
  buffer(resource: ResourceURL): Observable<ArrayBufferLike>;
  json<T = any>(
    resource: ResourceURL,
    check?: (d: unknown) => d is T
  ): Observable<T>;
}

export interface IResourceWriter {
  exists(location: ResourceURL): Promise<boolean>;
  writeBuffer(location: ResourceURL, data: ArrayBufferLike): Promise<void>;
  writeJSON(location: ResourceURL, data: unknown): Promise<void>;
}

export interface ResourceConfig {
  readonly backend: BackendType;
  readonly root: ResourceURL;
}

export interface FileBackedConfig extends ResourceConfig {
  readonly backend: BackendType.File;
}

export interface GoogleCloudStorageConfig extends ResourceConfig {
  readonly backend: BackendType.GCS;
  readonly signatory: ResourceURL;
}

export interface HTTPConfig extends ResourceConfig {
  readonly backend: BackendType.HTTP;
}

export interface HTTPSConfig extends ResourceConfig {
  readonly backend: BackendType.HTTPS;
}

export type BackendConfig =
  | FileBackedConfig
  | GoogleCloudStorageConfig
  | HTTPConfig
  | HTTPSConfig;
