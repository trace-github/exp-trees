import {
  BackendType,
  CubeSeries,
  DuckDBBackedArtifactsReader,
  FileBackedConfig,
  GoogleCloudResourceReader,
  initParquetCatalog,
  parquetBuffer
} from "@trace/artifacts";
import { assign, markAndMeasure } from "@trace/common";
import {
  AllocationAnalysisType,
  GrowthRateAnalysisType,
  NodeId,
  Tree,
  analysisTable,
  arithmeticTree,
  attributesTable,
  comparisonTable,
  configDateTable,
  debugTable,
  initLegacyTrees,
  metricRatioTable,
  nodeSheet,
  segmentationTree,
  seriesValueTable,
  treeDates
} from "@trace/tree";
import cliProgress from "cli-progress";
import { MultiDirectedGraph } from "graphology";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import {
  ReplaySubject,
  Subject,
  combineLatest,
  firstValueFrom,
  map,
  of
} from "rxjs";
import { CommandModule } from "yargs";
import { dirExists, must, printTable, spinner } from "../../lib";
import { duckdb } from "../../lib/duckdb/duckdb.node";
import { printCubeSeries, printPerformanceTable } from "../outputs";
import { promptDates, promptNode, promptTree } from "../prompts";
import { Trace } from "../trace";
import { resolveTree } from "./tree-resolver";
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

    const dates$: Subject<[Date, Date]> = new ReplaySubject(1);

    {
      const bar = new cliProgress.SingleBar({});

      resolveTree(artifacts, tree, dates$, {
        onMetricNode: () => bar.increment(),
        onOperatorNode: () => bar.increment()
      });

      // Prompt which node to resolve.
      const { node } = await promptNode(tree);

      // TODO: Why (-1)? Check later.
      bar.start(arithmeticTree(tree, node).order - 1, 0);

      const data = tree.getNodeAttribute(node, "data");

      if (data == undefined) throw "Fail.";

      // Resolve node (within tree).
      const series = await markAndMeasure("resolve", firstValueFrom(data));

      bar.stop();

      console.log("\n");

      printCubeSeries(series);
      printPerformanceTable("resolve");

      const dates = await promptDates(firstValueFrom(treeDates(tree)));
      dates$.next([dates[0], dates[1]]);

      // eslint-disable-next-line no-constant-condition
      if (false) {
        const nodeSheetOutput = await markAndMeasure(
          "evaluate-node-sheet",
          firstValueFrom(
            nodeSheet(arithmeticTree(tree), {
              root: node,
              options: {
                maxDepth: 1
              }
            })
          )
        );
        const nodeSheetBuffer = await parquetBuffer(nodeSheetOutput);
        const nodeSheetFile = join(workdir, `${node}-nodesheet.parquet`);

        await writeFile(nodeSheetFile, nodeSheetBuffer);

        const mixshiftTable = await markAndMeasure(
          "evaluate-comparison-table",
          firstValueFrom(
            comparisonTable(tree, {
              date1: dates[0],
              date2: dates[1],
              options: {
                maxDepth: Infinity
              }
            })
          )
        );
        const mixshifTableBuffer = await parquetBuffer(mixshiftTable);
        const mixshiftTabletFile = join(workdir, `${node}-mixshift.parquet`);
        await writeFile(mixshiftTabletFile, mixshifTableBuffer);

        console.table(mixshiftTable.slice(0, 5).toArray());
        console.log("\n");

        printPerformanceTable("resolve-analysis");
        printPerformanceTable("evaluate-node-sheet");
        printPerformanceTable("evaluate-comparison-table");
      }

      const ordering = segmentationTree(tree).nodes();

      const before$ = dates$.pipe(map(([before]) => before));
      const after$ = dates$.pipe(map(([, after]) => after));

      const table = await spinner(
        "Generating Table",
        firstValueFrom(
          combineLatest([
            debugTable("debug", tree, ordering),

            attributesTable("attributes", tree, ordering),

            configDateTable("before", tree, ordering, before$),
            seriesValueTable("before", tree, ordering, before$, 1),

            configDateTable("after", tree, ordering, after$),
            seriesValueTable("after", tree, ordering, after$, 1),

            metricRatioTable("metricRatio", tree, ordering, dates$, 1),

            analysisTable(
              "allocation",
              tree,
              ordering,
              of(AllocationAnalysisType.Allocation),
              1
            ),
            analysisTable(
              "allocationNormalized",
              tree,
              ordering,
              of(AllocationAnalysisType.AllocationNormalized),
              1
            ),
            analysisTable(
              "growthRate",
              tree,
              ordering,
              of(GrowthRateAnalysisType.GrowthRate),
              1
            ),
            analysisTable(
              "growthRateNormalized",
              tree,
              ordering,
              of(GrowthRateAnalysisType.GrowthRateNormalized),
              1
            )
          ]).pipe(map(assign))
        )
      );

      const mixshifTableBuffer = await parquetBuffer(table);
      const mixshiftTabletFile = join(
        workdir,
        `${node}-test-${Date.now()}.parquet`
      );
      await writeFile(mixshiftTabletFile, mixshifTableBuffer);

      console.table(table.slice(0, 5).toArray());
    }

    await db.terminate();
  }
};
