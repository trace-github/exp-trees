import { CubeSeries } from "@trace/artifacts";
import * as Arrow from "apache-arrow";
import { Observable, of } from "rxjs";
import { NodeId, Subtree } from "../../../types";
import { arithmeticTable } from "../generators";
import { RowFunc } from "../types";

export function configDateTable(
  id: string,
  tree: Subtree<CubeSeries>,
  ordering: NodeId[],
  input$: Observable<Date | null>,
  maxDepth?: number
): Observable<Arrow.Table> {
  return arithmeticTable(tree, ordering, input$, configValue$, {
    maxDepth,
    prefix: id
  });
}

const configValue$: RowFunc<CubeSeries, Date | null> = (
  _tree,
  _nodes,
  input
) => {
  return of({ date: input });
};
