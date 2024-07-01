import { Observable } from "rxjs";
import { NodeId, Subtree } from "../../types";

export type Comparison = [null, null] | [Date, null] | [Date, Date];

export type Column = string;

export type Cell = number | string | Date | null | undefined;
export type RowCell = { [key: Column]: Cell };
export type Row = Record<Column, Cell>;

export interface RowFunc<T, U> {
  (
    tree: Subtree<T>,
    node: [NodeId, ...NodeId[]],
    input: U,
    idx: number
  ): Observable<Row>;
}
