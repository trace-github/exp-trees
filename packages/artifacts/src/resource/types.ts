export type ResourceURL = string;

export enum BackendType {
  GCS = "gs",
  HTTP = "http",
  HTTPS = "https",
  File = "file",
}

export interface IResourceReader {
  buffer(resource: ResourceURL): Promise<ArrayBufferLike>;
  json<T = any>(
    resource: ResourceURL,
    check?: (d: unknown) => d is T
  ): Promise<T>;
}

interface ResourceConfig {
  backend: BackendType.File;
  root: ResourceURL;
}

export interface FileBackedConfig extends ResourceConfig {}

export interface GoogleCloudStorageConfig {
  backend: BackendType.GCS;
  signatory: ResourceURL;
  root: ResourceURL;
}

export interface HTTPConfig extends ResourceConfig {}
export interface HTTPSConfig extends ResourceConfig {}

export type BackendConfig =
  | FileBackedConfig
  | GoogleCloudStorageConfig
  | HTTPConfig
  | HTTPSConfig;
