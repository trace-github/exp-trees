import {
  CubeSeries,
  GoogleCloudResourceReader,
  IResourceReader,
  ParquetCatalogReader
} from "@trace/artifacts";
import {
  LegacyTreeClient,
  Tree,
  isLegacyTreeCatalog,
  resolvingVisitor
} from "@trace/tree";
import * as Arrow from "apache-arrow";
import { MultiDirectedGraph } from "graphology";
import os from "node:os";
import { readParquet } from "parquet-wasm";
import { firstValueFrom } from "rxjs";
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
    const reader = new GoogleCloudResourceReader(remoteConfig);
    const trees = await spinner("Trees", initTrees(reader, workspace));
    const catalog = await spinner("Catalog", initCatalog(reader, workspace));

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
      resolvingVisitor(tree, {
        onMetricNode(_tree, node) {
          console.log(node);
        }
      });
    }

    try {
      const conn = await db.connect();
      console.log(await conn.query("select 1"));
      await conn.close();
    } finally {
      await db.terminate();
    }

    catalog;
  }
};

// NOTE: I tried moving this into the ParquetReader class (static method);
// however, I was having "build" issues re: parquet-wasm.
async function initCatalog(reader: IResourceReader, workspace: string) {
  const buffer = await firstValueFrom(
    reader.buffer([workspace, "catalog.parquet"].join("/"))
  );
  const pq = readParquet(new Uint8Array(buffer));
  const table = Arrow.tableFromIPC(pq.intoIPCStream());

  return ParquetCatalogReader.withRelativeRoot(table, reader.config.root);
}

async function initTrees(reader: IResourceReader, workspace: string) {
  const treesList = await firstValueFrom(
    reader.json(`${workspace}/trees/trees.json`, isLegacyTreeCatalog)
  );
  return new LegacyTreeClient(reader, treesList);
}
