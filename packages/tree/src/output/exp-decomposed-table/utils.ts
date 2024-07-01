import { OperatorFunction, map } from "rxjs";
import { Row, RowCell } from "./types";

export function mergeRowCells(): OperatorFunction<RowCell[], Row> {
  return (obs) => obs.pipe(map((arr) => Object.assign({}, ...arr)));
}
