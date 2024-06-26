import * as Arrow from "apache-arrow";
import { readParquet } from "parquet-wasm";

export async function readSchemaFromBuffer(
  buffer: ArrayBufferLike
): Promise<Arrow.Schema> {
  const pq = await readParquet(new Uint8Array(buffer), { limit: 0 });
  const table = Arrow.tableFromIPC(pq.schema.intoIPCStream());
  return table.schema;
}
