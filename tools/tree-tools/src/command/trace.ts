import { BackendType, GoogleCloudStorageConfig } from "@trace/artifacts";

export class Trace {
  private constructor() {}

  public static remoteConfig(customer: string): GoogleCloudStorageConfig {
    return {
      backend: BackendType.GCS,
      root: `gs://tf-export-cubes-hellotrace-app/${customer}/`,
      signatory: "https://catalog.hellotrace.app/api"
    };
  }
}
