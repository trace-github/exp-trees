import {
  BackendType,
  CubeSeries,
  DuckDBBackedArtifactsReader,
  EmptyCubeSeries,
  FileBackedConfig,
  GoogleCloudResourceReader,
  IArtifactReader,
  cubeSeriesTable,
  ensureDates,
  initParquetCatalog,
  operatorSeries,
  readAttributeStartDates,
  replaceNullValue
} from "@trace/artifacts";
import {
  EdgeId,
  EdgeType,
  NodeId,
  NodeType,
  SeriesModifier,
  Subtree,
  Tree,
  TreeEdge,
  TreeNode,
  initLegacyTrees,
  resolvingVisitor,
  rowScope
} from "@trace/tree";
import cliProgress from "cli-progress";
import { compareAsc, isEqual } from "date-fns";
import { MultiDirectedGraph } from "graphology";
import * as MathJS from "mathjs";
import os from "node:os";
import {
  MonoTypeOperatorFunction,
  Observable,
  OperatorFunction,
  combineLatest,
  concatMap,
  firstValueFrom,
  forkJoin,
  from,
  map,
  of,
  tap,
  toArray
} from "rxjs";
import { CommandModule } from "yargs";
import { dirExists, must, printTable, spinner } from "../../lib";
import { duckdb } from "../../lib/duckdb/duckdb.node";
import { promptNode, promptTree } from "../prompts";
import { Trace } from "../trace";
import { GenerateArtifactsArguments } from "./types";

export const command: CommandModule<unknown, GenerateArtifactsArguments> = {
  command: "generate-artifacts <customer> [workspace]",

  describe: "Generate tree artifacts.",

  builder: {
    customer: {
      type: "string",
      requiresArg: true,
      describe: "The customer.",
      default: "trace-demo-shop"
    },
    workspace: {
      type: "string",
      requiresArg: false,
      describe: "The workspace.",
      default: "main"
    },
    workdir: {
      type: "string",
      requiresArg: false,
      default: os.tmpdir(),
      describe: "The internal data directory."
    }
  },

  async handler({ customer, workspace = "main", workdir }) {
    workdir = "/Users/andy/Desktop/TEST";

    // Ensure cli variables are valid.
    must(dirExists(workdir), "Scratch directory does not exist");

    // Show cli variables.
    {
      printTable(
        ["Customer", "Workspace", "Work Dir"],
        [customer, workspace, workdir]
      );
      console.log("\n");
    }

    // Initialize core dependencies;
    const db = await spinner("DuckDB", duckdb());

    // Initialize core clients.
    const remoteConfig = Trace.remoteConfig(customer);
    const fileCacheConfig: FileBackedConfig = {
      backend: BackendType.File,
      root: workdir
    };

    const reader = new GoogleCloudResourceReader(remoteConfig);
    const trees = await spinner("Trees", initLegacyTrees(reader, workspace));
    const catalog = await spinner(
      "Catalog",
      initParquetCatalog(reader, workspace)
    );
    const artifacts = new DuckDBBackedArtifactsReader(
      db,
      reader,
      catalog,
      fileCacheConfig
    );

    // Core variables.
    const tree: Tree<CubeSeries> = new MultiDirectedGraph();

    // Select and retrieve user selected tree.
    {
      const { treeId, timeGrain } = await promptTree(trees);
      const { config: treeConfig } = await trees.tree(treeId, timeGrain);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree.import(treeConfig.toJSON() as any);

      const nodesWithTransforms: NodeId[] = [];
      [...tree.nodeEntries()].forEach(({ node, attributes }) => {
        if (attributes.transform && attributes.transform.length > 0) {
          nodesWithTransforms.push(node);
        }
      });

      printTable(
        ["label", "Time Grain", "# Nodes", "# Nodes w/ Transform"],
        [
          tree.getAttribute("label"),
          tree.getAttribute("timegrain"),
          tree.order,
          nodesWithTransforms.length
        ]
      );
      console.log("\n");
    }

    const bar = new cliProgress.SingleBar({});

    {
      let at = 0;
      resolvingVisitor(tree, {
        onMetricNode(tree, node) {
          const obs = rxMetric(artifacts, tree, node).pipe(
            tap(() => bar.update(at++, { name: node }))
          );
          tree.setNodeAttribute(node, "data", obs);
        },
        onOperatorNode(tree, node) {
          const obs = rxOperator(artifacts, tree, node).pipe(
            tap(() => bar.update(at++, { name: node }))
          );
          tree.setNodeAttribute(node, "data", obs);
        }
      });

      {
        const { node } = await promptNode(tree);

        const data = tree.getNodeAttribute(node, "data");
        if (data == undefined) throw "Fail.";
        bar.start(tree.order, 1);
        performance.mark("resolve-start");

        const series = await firstValueFrom(data);
        bar.stop();
        // Resolve tree.
        performance.mark("resolve-end");
        performance.measure("resolve", "resolve-start", "resolve-end");

        console.table(cubeSeriesTable(series).toArray());
        console.log(
          performance.getEntriesByName("resolve", "measure").at(0)?.duration
        );
      }
    }

    await db.terminate();

    console.log(
      performance.getEntriesByName("CubeSeriesBuilder#withDates", "measure")
    );
  }
};

function nodeByType<T, U extends NodeType>(
  tree: Subtree<T>,
  node: NodeId,
  mustBeType: U
): (TreeNode<T> & { type: U }) | undefined {
  const exists = tree.hasNode(node);
  if (!exists) return undefined;

  const attributes = tree.getNodeAttributes(node);
  if (attributes.type != mustBeType) {
    throw `Not a '${mustBeType}' Node.`;
  }

  return attributes as TreeNode<T> & { type: U };
}

function outboundEdgesByType<T, U extends EdgeType>(
  tree: Subtree<T>,
  node: NodeId,
  type: U
): { [key: EdgeId]: Extract<TreeEdge, { type: U }> } {
  const outboundEdges: { [key: EdgeId]: Extract<TreeEdge, { type: U }> } = {};
  tree.forEachOutEdge(node, (edge, attributes) => {
    if (attributes.type != type) return;
    outboundEdges[edge] = attributes as Extract<TreeEdge, { type: U }>;
  });
  return outboundEdges;
}

function rxMetric(
  artifacts: IArtifactReader,
  tree: Subtree<CubeSeries>,
  node: NodeId
): Observable<CubeSeries> {
  const attributes = nodeByType(tree, node, NodeType.Metric);

  if (!attributes) return of(EmptyCubeSeries);

  const series = artifacts.cubeSeries({
    metricName: attributes.metricName,
    timeGrain: attributes.timeGrain,
    series: attributes.series
  });

  return series;
}

type OperatorInput = {
  modifiers: SeriesModifier | undefined;
  node: NodeId;
  series: CubeSeries;
};

function rxOperator(
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

  const mathematicalOperator = attributes.operator;

  return forkJoin(input).pipe(
    // Calculate operator inputs.
    map((input) => {
      const flatDates = input.flatMap(({ series }) =>
        readAttributeStartDates(series)
      );
      const dates = uniqueDates(flatDates).sort(compareAsc);
      return { dates, input };
    }),

    // Transform operator inputs.
    concatMap(({ dates, input }) => {
      return from(input).pipe(
        rxOperatorEnsureDates(dates),
        rxOperatorApplyModifiers(),
        toArray(),
        map((input) => ({ dates, input }))
      );
    }),

    // Apply arithmetic
    concatMap(({ dates, input }) => {
      const inputs: { [key: string]: CubeSeries } = {};
      input.reduce((acc, { node, series }) => {
        acc[node] = series;
        return acc;
      }, inputs);

      const expression = input
        .map((curr) => curr.node)
        .join(` ${mathematicalOperator} `);

      return of({ name: node, dates, expression, inputs }).pipe(
        rxEvaluateFormula()
      );
    })
  );
}

function rxValidateFormulaInputs(): MonoTypeOperatorFunction<{
  name: string;
  dates: Date[];
  expression: string;
  inputs: { [key: string]: CubeSeries };
}> {
  return (obs) => {
    return obs.pipe(
      tap(({ dates: ref, expression, inputs }) => {
        {
          // Check if the inputs have all the expression symbols.
          const ast = MathJS.parse(expression);
          ast.traverse((node) => {
            if (!MathJS.isSymbolNode(node)) return;
            if (inputs[node.name] == undefined) {
              throw "Invalid input: Missing terms.";
            }
          });
        }

        {
          const dates = [
            ref,
            ...Object.values(inputs).map(readAttributeStartDates)
          ];
          if (!dateArraysEqual(...dates)) {
            console.warn(
              `Invalid input: Dates do not match. (${dates.map((curr) => curr.length).join(", ")})`
            );

            throw "Invalid input: Dates do not match.";
          }
        }
      })
    );
  };
}

function rxEvaluateFormula(): OperatorFunction<
  {
    name: string;
    dates: Date[];
    expression: string;
    inputs: { [key: string]: CubeSeries };
  },
  CubeSeries
> {
  return (obs) =>
    obs.pipe(
      rxValidateFormulaInputs(),
      map(({ name, dates: ref, expression, inputs }) => {
        const expr = MathJS.compile(expression);

        const values: (number | null)[] = [];
        const dates: Date[] = [];
        for (let r = 0; r < ref.length; r++) {
          const scope = rowScope(inputs, r);
          const date = ref[r];

          let value: number | null;
          if (Object.values(scope).includes(null)) {
            value = null;
          } else {
            value = expr.evaluate(scope);
          }

          dates.push(date);
          values.push(value);
        }

        return operatorSeries(name, dates, values);
      })
    );
}

function dateArraysEqual(...arr: Date[][]): boolean {
  if (arr.length <= 1) return true;

  const [first, ...rest] = arr;
  for (const other of rest) {
    if (first.length != other.length) return false;

    const valuesEqual = first.every((date, i) => isEqual(date, other[i]));

    if (!valuesEqual) return false;
  }

  return true;
}

function rxOperatorEnsureDates(
  dates: Date[]
): MonoTypeOperatorFunction<OperatorInput> {
  return (obs) => {
    return obs.pipe(
      map(({ modifiers, node, series }) => {
        const ensuredSeries = ensureDates(series, dates);

        return {
          modifiers,
          node,
          series: ensuredSeries
        };
      })
    );
  };
}

function rxOperatorApplyModifiers(): MonoTypeOperatorFunction<OperatorInput> {
  return (obs) =>
    obs.pipe(
      map(({ modifiers, node, series }) => {
        if (modifiers?.ifNull != undefined) {
          series = replaceNullValue(series, modifiers.ifNull);
        }
        if (modifiers?.fill != undefined) {
          throw "Not implemented";
        }
        return { modifiers, node, series };
      })
    );
}

function uniqueDates(arr: Date[]) {
  const unique: Date[] = [];

  const seen = new Set<number>();
  for (const date of arr) {
    const t = date.getTime();

    if (seen.has(t)) continue;
    unique.push(date);
    seen.add(t);
  }

  return unique;
}
