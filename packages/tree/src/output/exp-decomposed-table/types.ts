import { Observable } from "rxjs";
import { NodeId, Subtree, Tree } from "../../types";

export type Cell = {
  column: string;
  value: number | null | undefined;
};

export type Row = Record<string, number | null | undefined>;

export interface CellFunc<T> {
  (
    tree: Tree<T> | Subtree<T>,
    node: NodeId,
    comparison: [null, null] | [Date, null] | [Date, Date]
  ): Observable<Cell>;
}
