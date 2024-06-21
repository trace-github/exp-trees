import {
  BackendType,
  CubeSeries,
  DuckDBBackedArtifactsReader,
  FileBackedConfig,
  GoogleCloudResourceReader,
  initParquetCatalog
} from "@trace/artifacts";
import { markAndMeasure } from "@trace/common";
import {
  AllocationAnalysisType,
  CorrelationAnalysisType,
  EdgeType,
  GrowthRateAnalysisType,
  MixshiftAnalysisType,
  MixshiftResult,
  NodeId,
  NodeType,
  Tree,
  allocationEdge,
  allocationNormalizedEdge,
  arithmeticTree,
  correlationEdge,
  edgesByType,
  growthRateForEdgeType,
  growthRateNormalizedEdge,
  initLegacyTrees,
  mixshiftAverageEdge,
  mixshiftMetricChangeFirstEdge,
  mixshiftMetricSegmentChangeFirstEdge,
  resolvingVisitor,
  rxMetric,
  rxOperator,
  treeDates
} from "@trace/tree";
import cliProgress from "cli-progress";
import { MultiDirectedGraph } from "graphology";
import os from "node:os";
import {
  Observable,
  ReplaySubject,
  Subject,
  defaultIfEmpty,
  firstValueFrom,
  map,
  tap,
  zip
} from "rxjs";
import { CommandModule } from "yargs";
import { dirExists, must, printTable, spinner } from "../../lib";
import { duckdb } from "../../lib/duckdb/duckdb.node";
import { printCubeSeries, printPerformanceTable } from "../outputs";
import { promptDates, promptNode, promptTree } from "../prompts";
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

    const config$: Subject<[Date, Date]> = new ReplaySubject(1);

    {
      const bar = new cliProgress.SingleBar({});

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
        },

        onArithmeticEdge(tree, edge) {
          const [source, target] = tree.extremities(edge);

          {
            // Add Correlation Analysis
            const attributes = correlationEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }

          {
            // Add Growth Rate Analysis
            const fn = growthRateForEdgeType[EdgeType.Arithmetic];
            tree.addDirectedEdge(source, target, fn(tree, edge, config$));
          }

          {
            // Add Growth Rate (Normalized) Analysis
            tree.addDirectedEdge(
              source,
              target,
              growthRateNormalizedEdge(tree, edge, config$)
            );
          }

          {
            // Add Allocation Analysis
            const attributes = allocationEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }

          {
            // Add Allocation (Normalized) Analysis
            const attributes = allocationNormalizedEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }
        },

        onSegmentationEdge(tree, edge) {
          const [source, target] = tree.extremities(edge);

          {
            // Add Correlation Analysis
            const attributes = correlationEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }

          {
            // Add Growth Rate Analysis
            const fn = growthRateForEdgeType[EdgeType.Segmentation];
            tree.addDirectedEdge(source, target, fn(tree, edge, config$));
          }

          {
            // Add Growth Rate (Normalized) Analysis
            tree.addDirectedEdge(
              source,
              target,
              growthRateNormalizedEdge(tree, edge, config$)
            );
          }

          {
            // Add Allocation Analysis
            const attributes = allocationEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }

          {
            // Add Allocation (Normalized) Analysis
            const attributes = allocationNormalizedEdge(tree, edge, config$);
            tree.addDirectedEdge(source, target, attributes);
          }

          {
            // Add Mixshift Analysis
            const sourceAttributes = tree.getSourceAttributes(edge);
            if (sourceAttributes.type == NodeType.Operator) {
              if (sourceAttributes.operator == "/") {
                {
                  const attributes = mixshiftAverageEdge(tree, edge, config$);
                  tree.addDirectedEdge(source, target, attributes);
                }

                {
                  const attributes = mixshiftMetricChangeFirstEdge(
                    tree,
                    edge,
                    config$
                  );
                  tree.addDirectedEdge(source, target, attributes);
                }

                {
                  const attributes = mixshiftMetricSegmentChangeFirstEdge(
                    tree,
                    edge,
                    config$
                  );
                  tree.addDirectedEdge(source, target, attributes);
                }
              }
            }
          }
        }
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

      {
        const { dates } = await promptDates(firstValueFrom(treeDates(tree)));

        const analysisEdgeMap = edgesByType(tree, EdgeType.Analysis);
        const analysis$: Observable<{
          source: NodeId;
          target: NodeId;
          type: string;
          value: number | null;
          format: string;
        }>[] = [];
        const mixshift$: Observable<{
          source: NodeId;
          target: NodeId;
          type: string;
          value: MixshiftResult | null;
          format: string;
        }>[] = [];

        for (const [edge, attributes] of Object.entries(analysisEdgeMap)) {
          const [source, target] = tree.extremities(edge);
          const sourceLabel = tree.getNodeAttribute(source, "label");
          const targetLabel = tree.getNodeAttribute(target, "label");

          if (
            attributes.analysis == CorrelationAnalysisType.Correlation ||
            attributes.analysis == GrowthRateAnalysisType.GrowthRate ||
            attributes.analysis ==
              GrowthRateAnalysisType.GrowthRateNormalized ||
            attributes.analysis == AllocationAnalysisType.Allocation ||
            attributes.analysis == AllocationAnalysisType.AllocationNormalized
          ) {
            analysis$.push(
              attributes.data.pipe(
                map((result) => ({
                  source: sourceLabel,
                  target: targetLabel,
                  type: attributes.analysis,
                  value: result.value,
                  format: result.format
                }))
              )
            );
          }

          if (
            attributes.analysis == MixshiftAnalysisType.MixshiftAverage ||
            attributes.analysis ==
              MixshiftAnalysisType.MixshiftMetricChangeFirst ||
            attributes.analysis ==
              MixshiftAnalysisType.MixshiftSegmentChangeFirst
          ) {
            mixshift$.push(
              attributes.data.pipe(
                map((result) => ({
                  source: sourceLabel,
                  target: targetLabel,
                  type: attributes.analysis,
                  value: result.value,
                  format: result.format
                }))
              )
            );
          }
        }

        config$.next(dates);

        const numericalTable = await markAndMeasure(
          "resolve-analysis",
          firstValueFrom(zip(analysis$).pipe(defaultIfEmpty([])))
        );

        console.table(numericalTable);

        const mixshiftTable = await markAndMeasure(
          "resolve-analysis",
          firstValueFrom(zip(mixshift$).pipe(defaultIfEmpty([])))
        );

        console.table(mixshiftTable);
      }

      console.log("\n");

      printPerformanceTable("resolve-analysis");

      printPerformanceTable("allocationEdge");
    }

    await db.terminate();
  }
};
