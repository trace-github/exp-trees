import * as Arrow from "apache-arrow";
import {
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  concatMap,
  from,
  map,
  switchMap,
  toArray,
  zip
} from "rxjs";
import { NodeId, Subtree, Tree } from "../../types";
import { Cell, CellFunc, Row } from "./types";

export function nodeSection<T>(
  tree: Tree<T> | Subtree<T>,
  rows: [NodeId, ...NodeId[]][],
  dates$: Observable<[null, null] | [Date, null] | [Date, Date]>,
  cell: CellFunc<T>,
  options: {
    prefix?: string;
  } = {}
): Observable<Arrow.Table> {
  const { prefix } = options;
  return dates$.pipe(
    switchMap((comparison) => {
      return from(rows).pipe(
        rxApplyCellFunc(tree, comparison, cell, prefix),
        toArray(),
        map((json) => Arrow.tableFromJSON(json))
      );
    })
  );
}

function rxApplyCellFunc<T>(
  tree: Subtree<T>,
  comparison: [null, null] | [Date, null] | [Date, Date],
  fn: CellFunc<T>,
  prefix?: string
): OperatorFunction<NodeId[], Row> {
  return (obs) =>
    obs.pipe(
      concatMap((nodes) => {
        const cell$ = nodes.map((node) => fn(tree, node, comparison));
        return zip(cell$).pipe(rxCellsToRow(), rxPrefixRow(prefix));
      })
    );
}

function rxCellsToRow(): OperatorFunction<Cell[], Row> {
  return (obs) =>
    obs.pipe(
      map((cells) => {
        return cells.reduce((acc, { column, value }) => {
          acc[column] = value;
          return acc;
        }, {} as Row);
      })
    );
}

function rxPrefixRow(prefix?: string): MonoTypeOperatorFunction<Row> {
  return (obs) =>
    obs.pipe(
      map((row) => {
        if (prefix == undefined || prefix == "") return row;
        return Object.entries(row).reduce((acc, [key, value]) => {
          const newKey = [prefix, key].join("_");
          acc[newKey] = value;
          return acc;
        }, {} as Row);
      })
    );
}
