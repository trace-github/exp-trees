import { CubeSeries } from "@trace/artifacts";
import { trim } from "@trace/common";
import * as Arrow from "apache-arrow";
import { Observable, of } from "rxjs";
import {
  NodeId,
  Subtree,
  Tree,
  isFixedSegmentDefinition
} from "../../../types";
import { computeSeries } from "../../comparison-table";
import { table } from "../generators";
import { annotateSectionId } from "../metadata";
import { Row } from "../types";

// export function attributesTable2(
//   id: string,
//   tree: Tree<CubeSeries> | Subtree<CubeSeries>,
//   ordering: NodeId[],
//   dates$: Observable<[null, null] | [Date, null] | [Date, Date]>
// ): Observable<Arrow.Table> {
//   return jsonSection(
//     tree,
//     ordering,
//     dates$,
//     (tree, node) => {
//       const seriesDefinition = computeSeries(tree, node) ?? [];
//       return seriesDefinition.reduce((acc, curr) => {
//         if (isFixedSegmentDefinition(curr)) return acc;
//         acc[curr.name] = trim(JSON.stringify(curr.value), `"'`);
//         return acc;
//       }, {} as Row);
//     },
//     { prefix: id }
//   ).pipe(rxAnnotateColumnName(id));
// }

export function attributesTable(
  id: string,
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  ordering: NodeId[]
): Observable<Arrow.Table> {
  return table(tree, ordering, of(true), (tree, [node]) => {
    const seriesDefinition = computeSeries(tree, node) ?? [];
    const row = seriesDefinition.reduce((acc, curr) => {
      if (isFixedSegmentDefinition(curr)) return acc;
      acc[curr.name] = trim(JSON.stringify(curr.value), `"'`);
      return acc;
    }, {} as Row);
    return of(row);
  }).pipe(annotateSectionId(id));
}
