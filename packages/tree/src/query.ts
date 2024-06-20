import { CubeSeries, readAttributeStartDates } from "@trace/artifacts";
import { unique } from "@trace/common";
import { Observable, concatMap, filter, from, map, toArray, zip } from "rxjs";
import { nodesByType } from "./tree";
import { NodeType, Tree } from "./types";

export function treeDates(tree: Tree<CubeSeries>) {
  // Note: There is a specific algorithm to perform an efficient query.
  // Thought: Find the first complete arithmetic "level" and query accross
  // the nodes

  const nodeMap = nodesByType(tree, NodeType.Metric);
  const nodes = Object.values(nodeMap);

  return from(nodes).pipe(
    map((x) => x.data),
    filter((data): data is Observable<CubeSeries> => {
      return data != undefined;
    }),
    toArray(),
    concatMap((arr) => zip(arr)),
    map((arr) => {
      const dates = arr.flatMap(readAttributeStartDates);
      return unique(dates);
    })
  );
}
