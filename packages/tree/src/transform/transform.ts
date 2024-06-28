import { CubeSeries } from "@trace/artifacts";
import { MonoTypeOperatorFunction, Observable, from, mergeMap, of } from "rxjs";
import {
  SeriesTransform,
  SeriesTransformFunction,
  SeriesTransformType
} from "../types/series-transform";
import { appendValues } from "./appendValues";
import { negateValues } from "./negateValues";
import { replaceAllValues } from "./replaceAllValues";
import { replaceValue } from "./replaceValue";
import { timeShift } from "./timeShift";

/**
 * Rx operator for applying an artifact transform(s).
 *
 * @param transforms
 * @returns
 */
export function rxCubeSeriesTransform(
  metricName: string,
  transforms: SeriesTransform = []
): MonoTypeOperatorFunction<CubeSeries> {
  if (transforms.length == 0) return (obs) => obs;

  const transformFuncs: SeriesTransformFunction[] = [];
  for (const curr of transforms) {
    switch (curr.type) {
      case SeriesTransformType.ReplaceValue:
        transformFuncs.push(
          replaceValue(metricName, curr.spec, { convertSpecToUTC: true })
        );
        break;

      case SeriesTransformType.Timeshift:
        transformFuncs.push(timeShift(metricName, curr.spec));
        break;

      case SeriesTransformType.AppendValues:
        transformFuncs.push(
          appendValues(metricName, curr.spec, { convertSpecToUTC: true })
        );
        break;

      case SeriesTransformType.ReplaceAllValues:
        transformFuncs.push(replaceAllValues(metricName, curr.spec));
        break;

      case SeriesTransformType.NegateValues:
        transformFuncs.push(negateValues(metricName));
        break;
    }
  }

  return (obs) => obs.pipe(rxCubeSeriesTransformApply(transformFuncs));
}

/**
 * Applies a sequence of transformation functions to a `CubeSeries` observable.
 * Each transformation is applied in the order they appear in the array.
 *
 * @param transforms - An array of functions that take a `CubeSeries` and return
 * either a transformed `CubeSeries` or a `Promise` that resolves to a
 * `CubeSeries`.
 *
 * @returns A MonoTypeOperatorFunction that applies the transformations
 * sequentially to the source `CubeSeries` observable.
 */
function rxCubeSeriesTransformApply(
  transforms: SeriesTransformFunction[]
): MonoTypeOperatorFunction<CubeSeries> {
  return (source: Observable<CubeSeries>) => {
    return source.pipe(
      mergeMap((cubeSeries) => {
        return from(transforms).pipe(
          mergeMap((transform) => {
            const result = transform(cubeSeries);
            if (result instanceof Promise) {
              return from(result);
            } else {
              return of(result);
            }
          }, 1)
        );
      })
    );
  };
}
