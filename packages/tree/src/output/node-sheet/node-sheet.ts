import { CubeSeries, readAttributeStartDates } from "@trace/artifacts";
import { unique } from "@trace/common";
import * as Arrow from "apache-arrow";
import { bfsFromNode } from "graphology-traversal";
import { Observable, combineLatest, concatMap, from, map, toArray } from "rxjs";
import { TreeNodeError } from "../../node/errors";
import { rxCubeSeriesEnsureDates } from "../../node/modifier";
import { NodeId, Subtree, Tree } from "../../types";
import { NodeSheetOutput } from "../types";

export function nodeSheet(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  config: Omit<NodeSheetOutput, "type">
): Observable<Arrow.Table> {
  const {
    root,
    options: { maxDepth = Infinity }
  } = config;

  const columns$: { [key: NodeId]: Observable<CubeSeries> } = {};
  bfsFromNode(tree, root, (node, attributes, depth) => {
    if (attributes.data == undefined) return true;
    columns$[node] = attributes.data;
    return depth >= maxDepth;
  });

  return combineLatest(columns$).pipe(
    concatMap((columns) => {
      const series = Object.values(columns);
      const dates = unique(series.flatMap(readAttributeStartDates), {
        sort: "asc"
      });

      return from(series).pipe(
        rxCubeSeriesEnsureDates(dates),
        toArray(),
        map((series) => {
          const rows: { [key: string]: unknown }[] = [];
          for (let r = 0; r < dates.length; r++) {
            const date = dates[r];
            const row: { [key: string]: unknown } = { date };

            for (let c = 0; c < series.length; c++) {
              const data = series[c];
              const curr = data.get(r);

              if (curr == null) throw TreeNodeError.UnexpectedNullRow;

              row[curr.name] = curr.value;
            }

            rows.push(row);
          }

          return Arrow.tableFromJSON(rows);
        })
      );
    })
  );
}
