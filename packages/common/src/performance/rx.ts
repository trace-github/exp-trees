import { MonoTypeOperatorFunction, Observable } from "rxjs";
import { tap } from "rxjs/operators";

/**
 * Creates an RxJS operator that marks the start of a performance measurement.
 *
 * @param name The name of the performance marker.
 * @returns A MonoTypeOperatorFunction that marks the start of the measurement.
 */
export function rxMarkStart<T>(name: string): MonoTypeOperatorFunction<T> {
  return function (source: Observable<T>): Observable<T> {
    return source.pipe(tap(() => performance.mark(markName(name, "start"))));
  };
}

/**
 * Creates an RxJS operator that marks the end of a performance measurement and
 * records the duration.
 *
 * @param name The name of the performance marker.
 * @returns A MonoTypeOperatorFunction that marks the end of the measurement and
 * records the duration.
 */
export function rxMarkEndAndMeasure<T>(
  name: string
): MonoTypeOperatorFunction<T> {
  const startMark = markName(name, "start");
  const endMark = markName(name, "end");

  return function (source: Observable<T>): Observable<T> {
    return source.pipe(
      tap(() => {
        performance.mark(endMark);
        performance.measure(name, startMark, endMark);
      })
    );
  };
}

// Helper function to generate performance mark names.
function markName(name: string, type: "start" | "end"): string {
  return `${name}-${type}`;
}
