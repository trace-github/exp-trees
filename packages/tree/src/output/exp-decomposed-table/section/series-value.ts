import {
  CubeSeries,
  findCubeSeriesCountAtDate,
  findCubeSeriesValueAtDate
} from "@trace/artifacts";
import * as Arrow from "apache-arrow";
import { Observable, map, of, zip } from "rxjs";
import { NodeId, Subtree } from "../../../types";
import { arithmeticTable } from "../generators";
import { RowCell, RowFunc } from "../types";
import { mergeRowCells } from "../utils";

export function seriesValueTable(
  id: string,
  tree: Subtree<CubeSeries>,
  ordering: NodeId[],
  input$: Observable<Date | null>,
  maxDepth?: number
): Observable<Arrow.Table> {
  return arithmeticTable(tree, ordering, input$, seriesValue$, {
    maxDepth,
    prefix: id
  });
}

const seriesValue$: RowFunc<CubeSeries, Date | null> = (tree, nodes, input) => {
  const columns$: Observable<RowCell>[] = [];

  for (const node of nodes) {
    const { data: series$, metricName } = tree.getNodeAttributes(node);

    if (input == null || series$ == undefined) {
      columns$.push(
        of({
          [metricName]: undefined,
          [`${metricName}_count`]: undefined
        })
      );
    } else {
      columns$.push(
        series$.pipe(
          map((series) => {
            const value = findCubeSeriesValueAtDate(series, input);
            const count = findCubeSeriesCountAtDate(series, input);
            return {
              [metricName]: value,
              [`${metricName}_count`]: count
            };
          })
        )
      );
    }
  }

  return zip(columns$).pipe(mergeRowCells());
};
