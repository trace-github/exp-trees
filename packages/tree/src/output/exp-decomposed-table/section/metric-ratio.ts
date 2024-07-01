import { CubeSeries } from "@trace/artifacts";
import * as Arrow from "apache-arrow";
import { Observable, combineLatest, of } from "rxjs";
import { rxMetricRatio } from "../../../analysis/ratio";
import { NodeId, Subtree } from "../../../types";
import { arithmeticTable } from "../generators";
import { annotateSectionId as rxMetadataColumnToString } from "../metadata";
import { Cell, Comparison, RowFunc } from "../types";

export function metricRatioTable(
  id: string,
  tree: Subtree<CubeSeries>,
  ordering: NodeId[],
  dates$: Observable<Comparison>,
  maxDepth = 0
): Observable<Arrow.Table> {
  return arithmeticTable(tree, ordering, dates$, metricRatio$, {
    prefix: id,
    maxDepth
  }).pipe(rxMetadataColumnToString(id));
}

const metricRatio$: RowFunc<CubeSeries, Comparison> = (
  tree,
  nodes,
  input,
  _idx
) => {
  const [before, after] = input;

  if (before == null || after == null) return of({});

  const columns$: Record<string, Observable<Cell>> = {};
  for (const node of nodes) {
    const metricName = tree.getNodeAttribute(node, "metricName");
    const series$ = tree.getNodeAttribute(node, "data");

    if (series$ == undefined) continue;

    columns$[metricName] = rxMetricRatio([after, before], tree, node);
  }

  return combineLatest(columns$);
};
