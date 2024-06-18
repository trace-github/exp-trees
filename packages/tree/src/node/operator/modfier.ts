import { CommonError } from "@trace/common";
import { MonoTypeOperatorFunction, concatMap, map, of } from "rxjs";
import { rxCubeSeriesEnsureDates, rxReplaceNullValues } from "../modifier";
import { OperatorInput } from "./types";

export function rxOperatorEnsureDates(
  dates: Date[]
): MonoTypeOperatorFunction<OperatorInput> {
  return (obs) => {
    return obs.pipe(
      concatMap(({ series, ...rest }) => {
        return of(series).pipe(
          rxCubeSeriesEnsureDates(dates),
          map((series) => ({ series, ...rest }))
        );
      })
    );
  };
}

export function rxOperatorApplySeriesModifiers(): MonoTypeOperatorFunction<OperatorInput> {
  return (obs) =>
    obs.pipe(
      concatMap((input) => {
        const { modifiers } = input;

        if (modifiers?.fill) {
          throw CommonError.NotImplemented;
        }

        if (modifiers?.ifNull != undefined) {
          return of(input.series).pipe(
            rxReplaceNullValues(modifiers.ifNull),
            map((output) => ({ ...input, series: output }))
          );
        }

        return of(input);
      })
    );
}
