import * as Arrow from "apache-arrow";
import {
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  concatMap,
  from,
  map,
  switchMap,
  toArray
} from "rxjs";
import { arithmeticChildren } from "../../arithmetic";
import { NodeId, Subtree, Tree } from "../../types";
import { Row, RowFunc } from "./types";

export function arithmeticTable<T, U>(
  tree: Tree<T> | Subtree<T>,
  ordering: NodeId[],
  input$: Observable<U>,
  fn: RowFunc<T, U>,
  options: {
    prefix?: string;
    maxDepth?: number;
  } = {}
) {
  const { prefix, maxDepth } = options;
  const nodes: [NodeId, ...NodeId[]][] = [];
  for (const root of ordering) {
    const children = arithmeticChildren(tree, root, { maxDepth });
    nodes.push([root, ...children]);
  }

  return table(tree, nodes, input$, fn, prefix);
}

export function table<T, U>(
  tree: Tree<T> | Subtree<T>,
  table: ([NodeId, ...NodeId[]] | NodeId)[],
  input$: Observable<U>,
  fn: RowFunc<T, U>,
  prefix?: string
): Observable<Arrow.Table> {
  return input$.pipe(
    switchMap((input) => {
      return from(table).pipe(
        ensureTuple(),
        concatMap((row, idx) => fn(tree, row, input, idx)),
        prefixRow(prefix),
        toArray(),
        map(Arrow.tableFromJSON)
      );
    })
  );
}

function ensureTuple<T>(): OperatorFunction<T | [T, ...T[]], [T, ...T[]]> {
  return (obs) =>
    obs.pipe(
      map((input: T | [T, ...T[]]): [T, ...T[]] => {
        if (Array.isArray(input)) {
          return input as [T, ...T[]];
        } else {
          return [input] as [T, ...T[]];
        }
      })
    );
}

function prefixRow(prefix?: string): MonoTypeOperatorFunction<Row> {
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
