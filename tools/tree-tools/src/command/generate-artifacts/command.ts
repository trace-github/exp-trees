import { GoogleCloudResourceReader } from "@trace/artifacts";
import { LegacyTreeClient } from "@trace/tree";
import os from "node:os";
import { CommandModule } from "yargs";
import { dirExists, must, printTable, spinner } from "../../lib";
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

  async handler({ customer, workspace, workdir }) {
    must(dirExists(workdir), "Scratch directory does not exist");

    const remoteConfig = Trace.remoteConfig(customer);
    const reader = new GoogleCloudResourceReader(remoteConfig);

    const trees = await spinner(
      "Trees",
      LegacyTreeClient.from(reader, `${workspace}/trees/trees.json`)
    );

    console.log("\n");
    printTable(["Customer", "Workspace", "# Trees"], [customer, workspace]);

    console.log("\n");
    const tree = await promptTree(trees);

    console.log("\n");
    printTable(
      ["label", "Time Grain", "# Nodes"],
      [tree.getAttribute("label"), tree.getAttribute("timegrain"), tree.order]
    );
  }
};
