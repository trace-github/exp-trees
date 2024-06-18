import {
  CubeSeries,
  EmptyCubeSeries,
  IArtifactReader,
  readAttributeStartDates
} from "@trace/artifacts";
import { unique } from "@trace/common";
import {
  Observable,
  combineLatest,
  concatMap,
  forkJoin,
  from,
  map,
  of,
  toArray
} from "rxjs";
import { nodeByType, outboundEdgesByType } from "../../tree";
import { EdgeType, NodeId, NodeType, Subtree } from "../../types";
import { rxEvaluateExpression } from "../evaluate";
import {
  rxOperatorApplySeriesModifiers,
  rxOperatorEnsureDates
} from "./modfier";
import { OperatorInput } from "./types";

export function rxOperator(
  _artifacts: IArtifactReader,
  tree: Subtree<CubeSeries>,
  node: NodeId
): Observable<CubeSeries> {
  const attributes = nodeByType(tree, node, NodeType.Operator);
  if (!attributes) return of(EmptyCubeSeries);

  const children = outboundEdgesByType<CubeSeries, EdgeType.Arithmetic>(
    tree,
    node,
    EdgeType.Arithmetic
  );

  const input: Observable<OperatorInput>[] = [];
  for (const [edge, edgeAttributes] of Object.entries(children)) {
    const [, node] = tree.extremities(edge);
    const series = tree.getNodeAttribute(node, "data");

    if (series == undefined) {
      throw "Series is undefined.";
    }

    input.push(
      combineLatest({
        node: of(node),
        series,
        modifiers: of(edgeAttributes.modifiers)
      })
    );
  }

  return forkJoin(input).pipe(
    // Calculate operator inputs.
    map((input) => {
      const all = input.flatMap(({ series }) =>
        readAttributeStartDates(series)
      );
      const uniq = unique(all, { sort: "asc" });
      return { dates: uniq, input };
    }),

    // Transform operator inputs.
    concatMap(({ dates, input }) => {
      return from(input).pipe(
        rxOperatorEnsureDates(dates),
        rxOperatorApplySeriesModifiers(),
        toArray(),
        map((input) => {
          const expression = input
            .map((curr) => curr.node)
            .join(` ${attributes.operator} `);
          const inputs = input.reduce(
            (acc, { node, series }) => {
              acc[node] = series;
              return acc;
            },
            {} as { [key: string]: CubeSeries }
          );
          const name = node;

          return { dates, expression, name, inputs };
        })
      );
    }),

    // Calculate operator
    rxEvaluateExpression()
  );
}
