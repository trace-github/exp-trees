import * as Arrow from "apache-arrow";
import { Table, readParquet, writeParquet } from "parquet-wasm";
import { Observable, firstValueFrom, isObservable } from "rxjs";

/**
 * Reads a schema from a buffer in Parquet format and returns it as an Arrow
 * schema.
 *
 * @param buffer - The buffer containing the Parquet data.
 * @returns A promise that resolves to the Arrow schema.
 * @throws Will throw an error if reading the schema fails.
 */
export async function readSchemaFromBuffer(
  buffer: Uint8Array
): Promise<Arrow.Schema> {
  const wasmTable = await readParquet(buffer, { limit: 0 });
  const arrowTable = Arrow.tableFromIPC(wasmTable.schema.intoIPCStream());
  return arrowTable.schema;
}

/**
 * Converts an Arrow table to a Parquet buffer. Accepts an Arrow table,
 * an Observable of an Arrow table, or a Promise of an Arrow table.
 *
 * @param target - The Arrow table, Observable, or Promise to convert.
 * @returns A promise that resolves to a Uint8Array containing the Parquet
 * buffer.
 * @throws Will throw an error if conversion to Parquet fails.
 */
export async function parquetBuffer(
  target: Arrow.Table | Observable<Arrow.Table> | Promise<Arrow.Table>
): Promise<Uint8Array> {
  let table: Arrow.Table;
  if (isObservable(target)) {
    table = await firstValueFrom(target);
  } else if (target instanceof Promise) {
    table = await target;
  } else {
    table = target;
  }

  const buffer = writeParquet(Table.fromIPCStream(Arrow.tableToIPC(table)));

  return buffer;
}
