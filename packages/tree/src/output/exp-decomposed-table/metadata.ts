import * as Arrow from "apache-arrow";
import { MonoTypeOperatorFunction, tap } from "rxjs";

export function annotateSectionId(
  value: string
): MonoTypeOperatorFunction<Arrow.Table> {
  return (obs) =>
    obs.pipe(
      tap((table) => {
        for (const column of table.schema.names) {
          table.schema.metadata.set(column.toString(), value);
        }
      })
    );
}
