import { CubeSeries } from "@trace/artifacts";
import * as Arrow from "apache-arrow";
import { Observable, of } from "rxjs";
import { NodeId, Subtree, Tree } from "../../../types";
import { table } from "../generators";
import { annotateSectionId } from "../metadata";

export function debugTable(
  id: string,
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  ordering: NodeId[]
): Observable<Arrow.Table> {
  return table(tree, ordering, of(true), (_tree, [node], _input, idx) => {
    return of({ node, idx });
  }).pipe(annotateSectionId(id));
}
