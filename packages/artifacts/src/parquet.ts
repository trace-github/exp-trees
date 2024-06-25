import * as Arrow from "apache-arrow";
import { Table, writeParquet } from "parquet-wasm";
import { Observable, firstValueFrom, isObservable } from "rxjs";

export async function toParquetBuffer(
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
