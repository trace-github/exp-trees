import { access, constants, writeFile } from "fs/promises";
import { mkdirp } from "mkdirp";
import path from "path";
import { FileBackedConfig, IResourceWriter, ResourceURL } from "../types";

export class FileBackedWriter implements IResourceWriter {
  public readonly config: FileBackedConfig;

  constructor(config: FileBackedConfig) {
    this.config = config;
  }

  protected resolve(resource: ResourceURL): ResourceURL {
    return [this.config.root, resource].join("/");
  }

  async exists(resource: ResourceURL): Promise<boolean> {
    const filePath = this.resolve(resource);
    const exists = await FileBackedWriter.fileExists(filePath);
    return exists;
  }

  async writeBuffer(
    resource: ResourceURL,
    buffer: ArrayBufferLike
  ): Promise<void> {
    const filePath = this.resolve(resource);

    await mkdirp(path.dirname(filePath));
    await writeFile(filePath, new Uint8Array(buffer), {
      flag: "a+"
    });

    return;
  }

  async writeJSON(resource: ResourceURL, json: unknown): Promise<void> {
    const filePath = this.resolve(resource);

    await mkdirp(path.dirname(filePath));

    return writeFile(filePath, JSON.stringify(json), { flag: "w+" });
  }

  private static fileExists(resource: ResourceURL): Promise<boolean> {
    return access(resource, constants.F_OK)
      .then(() => true)
      .catch(() => false);
  }
}
