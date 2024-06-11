import { measure } from "@trace/common";
import { accessSync } from "fs";
import { constants, writeFile } from "fs/promises";
import { mkdirp } from "mkdirp";
import path from "path";
import { FileBackedConfig, IResourceWriter, ResourceURL } from "../types";

export class FileBackedWriter implements IResourceWriter {
  public readonly config: FileBackedConfig;

  constructor(config: FileBackedConfig) {
    this.config = config;
  }

  @measure("FileBackedWriter.exists")
  exists(resource: ResourceURL): boolean {
    const filePath = this.resolve(resource);
    const exists = FileBackedWriter.fileExists(filePath);
    return exists;
  }

  @measure("FileBackedWriter.writeBuffer")
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

  @measure("FileBackedWriter.writeJSON")
  async writeJSON(resource: ResourceURL, json: unknown): Promise<void> {
    const filePath = this.resolve(resource);

    await mkdirp(path.dirname(filePath));

    return writeFile(filePath, JSON.stringify(json), { flag: "w+" });
  }

  protected resolve(resource: ResourceURL): ResourceURL {
    return [this.config.root, resource].join("/");
  }

  private static fileExists(resource: ResourceURL): boolean {
    try {
      accessSync(resource, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}
