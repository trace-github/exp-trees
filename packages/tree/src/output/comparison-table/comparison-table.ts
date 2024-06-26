import {
  Attribute,
  AttributeValue,
  CubeSeries,
  findCubeSeriesValueAtDate
} from "@trace/artifacts";
import { assign, filterEmpty, trim } from "@trace/common";
import * as Arrow from "apache-arrow";
import { bfsFromNode } from "graphology-traversal";
import {
  MonoTypeOperatorFunction,
  Observable,
  combineLatest,
  combineLatestWith,
  concatMap,
  from,
  map,
  of,
  tap,
  toArray
} from "rxjs";
import { arithmeticTree } from "../../arithmetic";
import { segmentationTree } from "../../segmentation";
import { rootNode } from "../../tree";
import {
  EdgeType,
  FixedSegmentDefinition,
  NodeId,
  NodeType,
  SeriesDefinition,
  Subtree,
  Tree
} from "../../types";
import { ComparisonTableOutput } from "../types";
import { SectionId } from "./types";

export function comparisonTable(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  config: Omit<ComparisonTableOutput, "type">
): Observable<Arrow.Table> {
  const { root, date1, date2, options = {} } = config;
  const { maxDepth = Infinity } = options;

  const spine = segmentationTree(tree, root);

  const ordering: NodeId[] = [];
  bfsFromNode(spine, rootNode(spine), (node) => {
    ordering.push(node);
  });

  return combineLatest([
    debugSection("debug", tree, ordering),
    seriesSection("attributes", tree, ordering),
    nodeValuesSection("before", tree, ordering, of(date1), {
      maxDepth
    }),
    nodeValuesSection("after", tree, ordering, of(date2), {
      maxDepth
    })
  ]).pipe(map(assign));
}

function debugSection<T>(
  sectionId: SectionId,
  tree: Tree<T> | Subtree<T>,
  ordering: NodeId[],
  options: {} = {}
): Observable<Arrow.Table> {
  const scan$: Observable<[NodeId | null, NodeType | null]> = from(
    ordering
  ).pipe(
    map((node) => {
      if (!tree.hasNode(node)) {
        return [null, null];
      } else {
        const type = tree.getNodeAttribute(node, "type");
        return [node, type];
      }
    })
  );

  return scan$.pipe(
    toArray(),
    map((arr) => {
      const nodeBuilder = new Arrow.Utf8Builder({
        type: new Arrow.Utf8(),
        nullValues: [null, undefined]
      });

      const nodeTypeBuilder = new Arrow.Utf8Builder({
        type: new Arrow.Utf8(),
        nullValues: [null, undefined]
      });

      for (const [node, type] of arr) {
        nodeBuilder.append(node);
        nodeTypeBuilder.append(type);
      }

      const nodeColumnName = filterEmpty([sectionId, "node"]).join("_");
      const nodeTypeColumnName = filterEmpty([sectionId, "type"]).join("_");

      const table = new Arrow.Table({
        [nodeColumnName]: nodeBuilder.toVector(),
        [nodeTypeColumnName]: nodeTypeBuilder.toVector()
      });

      return table;
    }),
    rxAnnotateSectionId(sectionId)
  );
}

function seriesSection(
  sectionId: SectionId,
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  ordering: NodeId[],
  options: {} = {}
): Observable<Arrow.Table> {
  const scan$: Observable<Record<Attribute, AttributeValue>> = from(
    ordering
  ).pipe(
    map((node) => {
      if (!tree.hasNode(node)) {
        return {};
      } else {
        const data: SeriesDefinition = computeSeries(tree, node) ?? [];
        return data.reduce(
          (acc, definition) => {
            if (isFixedSegmentDefinition(definition)) return acc;
            const name = columnName(definition.name, sectionId);
            acc[name] = trim(JSON.stringify(definition.value), `"'`);
            return acc;
          },
          {} as Record<string, AttributeValue>
        );
      }
    })
  );

  return scan$.pipe(
    toArray(),
    map(Arrow.tableFromJSON),
    rxAnnotateSectionId(sectionId)
  );
}

function nodeValuesSection(
  sectionId: SectionId,
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  ordering: NodeId[],
  date$: Observable<Date>,
  options: {
    maxDepth?: number;
  } = {}
): Observable<Arrow.Table> {
  const { maxDepth = 0 } = options;

  return date$.pipe(
    combineLatestWith(from(ordering)),
    map(([date, root]): [Date, NodeId, NodeId[]] => {
      const anchorTree = arithmeticTree(tree, root);
      const nodes: NodeId[] = [];
      bfsFromNode(anchorTree, root, (node, _attributes, depth) => {
        nodes.push(node);
        return depth >= maxDepth;
      });
      return [date, root, nodes];
    }),
    concatMap(([date, _root, nodes]) => {
      const columns$: Record<
        NodeId,
        Observable<Date | number | null | undefined>
      > = {
        [columnName("date", sectionId)]: of(date)
      };

      for (const node of nodes) {
        const { metricName } = tree.getNodeAttributes(node);
        const column = columnName(metricName, sectionId);
        columns$[column] = nodeValueAtDate(tree, node, date);
      }

      return combineLatest(columns$);
    }),
    toArray(),
    map(Arrow.tableFromJSON),
    rxAnnotateSectionId(sectionId)
  );
}

function columnName(
  name: string,
  prefix: string | undefined,
  delimeter: string = "_"
) {
  return filterEmpty([prefix, name]).join(delimeter);
}

function nodeValueAtDate(
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  node: NodeId,
  date: Date
) {
  if (!tree.hasNode(node)) return of(null);

  const data$ = tree.getNodeAttribute(node, "data");

  if (data$ == undefined) return of(null);

  return data$.pipe(map((series) => findCubeSeriesValueAtDate(series, date)));
}

function rxAnnotateSectionId(
  sectionId: string
): MonoTypeOperatorFunction<Arrow.Table> {
  return (obs) =>
    obs.pipe(
      tap((table) => {
        for (const columnName of table.schema.names) {
          table.schema.metadata.set(columnName.toString(), sectionId);
        }
      })
    );
}

export function computeSeries(
  tree: Subtree<unknown>,
  node: NodeId
): SeriesDefinition | null {
  if (!tree.hasNode(node)) return null;

  const attributes = tree.getNodeAttributes(node);

  let result: SeriesDefinition | null;
  switch (attributes.type) {
    case NodeType.Metric:
      result = attributes.series;
      break;

    case NodeType.Operator: {
      const edges = tree.filterOutboundEdges(node, (_edge, attributes) => {
        return attributes.type == EdgeType.Arithmetic;
      });

      const children = edges.map((edge) => {
        const [, target] = tree.extremities(edge);
        return computeSeries(tree, target);
      });

      const nonNullChildren: SeriesDefinition[] = [];
      for (const child of children) {
        if (child == null) return null;
        nonNullChildren.push(child);
      }

      result = mergeSeries(nonNullChildren);
      break;
    }
    case NodeType.Formula:
      result = attributes.series;
      break;
  }

  return result;
}

export function mergeSeries(target: SeriesDefinition[]): SeriesDefinition {
  if (target.length == 0) return [];

  const result: SeriesDefinition = [];
  for (let i = 0; i < target[0].length; i++) {
    const first = target[0][i];

    let ok = false;
    if (isFixedSegmentDefinition(first)) {
      ok = target.every((series) => {
        const test = series.at(i);
        if (!test) return false;
        if (!isFixedSegmentDefinition(test)) return false;
        if (test.name != first.name) return false;
        return true;
      });
    } else {
      ok = target.every((series) => {
        const test = series.at(i);
        if (!test) return false;
        if (isFixedSegmentDefinition(test)) return false;
        if (test.name != first.name) return false;
        if (test.value != first.value) return false;
        return true;
      });
    }

    if (!ok) return result;

    result.push(first);
  }

  return result;
}

export function isFixedSegmentDefinition(
  obj: unknown
): obj is FixedSegmentDefinition {
  const typedObj = obj as FixedSegmentDefinition;
  return (
    ((typedObj !== null && typeof typedObj === "object") ||
      typeof typedObj === "function") &&
    typedObj["name"] === "start"
  );
}
