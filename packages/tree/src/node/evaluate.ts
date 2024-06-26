import {
  CubeSeries,
  cubeSeriesFromArrays,
  readAttributeStartDates
} from "@trace/artifacts";
import { equalArrays } from "@trace/common";
import { compile, isSymbolNode, parse } from "mathjs";
import { OperatorFunction, map, tap } from "rxjs";
import { TreeNodeError } from "./errors";
import { EvaluateInput } from "./types";

export function rxEvaluateExpression(): OperatorFunction<
  EvaluateInput,
  CubeSeries
> {
  return (obs) =>
    obs.pipe(
      tap(({ expression, inputs }) => validateSymbols(expression, inputs)),
      tap(({ inputs }) => validateDatesAreSame(Object.values(inputs))),

      map(({ expression, inputs, name }) => {
        const series = Object.values(inputs);

        if (series.length == 0) {
          throw TreeNodeError.EvaluationInputIsEmpty;
        }

        const firstSeries = series[0];
        const expr = compile(expression);

        const values: (number | null)[] = [];
        const dates: Date[] = [];
        for (let r = 0; r < firstSeries.numRows; r++) {
          const row = firstSeries.get(r);

          if (row == null) {
            throw TreeNodeError.UnexpectedNullRow;
          }

          const date = row.a.start;
          const scope = rowScope(inputs, r);

          // A expression can be evaluated iff all scope's values are non-null.
          let value: number | null;
          if (Object.values(scope).includes(null)) {
            value = null;
          } else {
            value = expr.evaluate(scope);
          }

          dates.push(date);
          values.push(value);
        }

        return cubeSeriesFromArrays(name, dates, values, {});
      })
    );
}

/**
 * Validates that the expression contains symbols that are present in the
 * inputs.
 *
 * @param expression - The expression to validate.
 * @param inputs - The inputs containing CubeSeries.
 * @throws Will throw an error if any symbols in the
 *         expression are missing in the inputs.
 */
function validateSymbols(
  expression: string,
  inputs: { [key: string]: CubeSeries }
): void {
  const ast = parse(expression);
  ast.traverse((node) => {
    if (isSymbolNode(node) && !(node.name in inputs)) {
      throw new Error(`Invalid input: Missing term '${node.name}'.`);
    }
  });
}

/**
 * Validates that the reference dates match the dates in the inputs.
 *
 * @param ref - The reference dates.
 * @param inputs - The inputs containing CubeSeries.
 * @throws Will throw an error if the dates do not match.
 */
function validateDatesAreSame(arr: CubeSeries[]): void {
  const [first, ...rest] = arr.map(readAttributeStartDates);
  if (!equalArrays(first, ...rest)) {
    throw new Error("Invalid input: Dates do not match.");
  }
}

function rowScope(
  inputs: { [key: string]: CubeSeries },
  rowIdx: number
): { [key: string]: number | null } {
  const result: { [key: string]: number | null } = {};
  for (const [name, series] of Object.entries(inputs)) {
    const value = series.get(rowIdx)?.value;
    if (value != undefined && value != null) {
      result[name] = Number(value);
    } else {
      result[name] = null;
    }
  }
  return result;
}
