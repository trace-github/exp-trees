import {
  BackendType,
  CubeSeries,
  CubeSlice,
  DuckDBBackedArtifactsReader,
  FileBackedConfig,
  GoogleCloudResourceReader,
  initParquetCatalog
} from "@trace/artifacts";
import { Tree, initLegacyTrees, resolvingVisitor } from "@trace/tree";
import { MultiDirectedGraph } from "graphology";
import os from "node:os";
import { Observable, firstValueFrom, zip } from "rxjs";
import { CommandModule } from "yargs";
import { dirExists, must, printTable, spinner } from "../../lib";
import { duckdb } from "../../lib/duckdb/duckdb.node";
import { promptTree } from "../prompts";
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
    workdir = "/Users/andy/Documents/Code/trace/data";

    // Ensure cli variables are valid.
    must(dirExists(workdir), "Scratch directory does not exist");

    // Show cli variables.
    {
      printTable(["Customer", "Workspace"], [customer, workspace]);
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

    // Show workspace summary.
    {
      printTable(["Customer", "Workspace"], [customer, workspace]);
      console.log("\n");
    }

    // Core variables.
    const tree: Tree<CubeSeries> = new MultiDirectedGraph();

    // Select and retrieve user selected tree.
    {
      const { treeId, timeGrain } = await promptTree(trees);
      const { config: treeConfig } = await trees.tree(treeId, timeGrain);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tree.import(treeConfig.toJSON() as any);

      printTable(
        ["label", "Time Grain", "# Nodes"],
        [tree.getAttribute("label"), tree.getAttribute("timegrain"), tree.order]
      );
      console.log("\n");
    }

    // Resolve tree.
    {
      const slices: Observable<CubeSlice>[] = [];

      resolvingVisitor(tree, {
        onMetricNode(_tree, node, attributes) {
          slices.push(
            artifacts.cubeSlice({
              metricName: attributes.metricName,
              timeGrain: attributes.timeGrain,
              segment: attributes.series.map(({ name }) => name)
            })
          );
        }
      });

      performance.mark("resolve-all-start");
      const result = await firstValueFrom(zip(slices));
      performance.mark("resolve-all-end");

      console.log(
        performance.measure(
          "resolve-all",
          "resolve-all-start",
          "resolve-all-end"
        )
      );
      console.log(result.map((table) => table.numRows));
    }

    await db.terminate();
  }
};
