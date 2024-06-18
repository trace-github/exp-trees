import { CubeTimeGrain } from "@trace/artifacts";
import {
  ITreeClient,
  NodeId,
  Subtree,
  Tree,
  TreeListResponse,
  TreeNodeType,
  arithmeticTree,
  rootNode
} from "@trace/tree";
import { bfsFromNode } from "graphology-traversal";
import prompts from "prompts";

export async function promptTree(client: ITreeClient): Promise<{
  treeId: string;
  timeGrain: CubeTimeGrain;
}> {
  const { tree }: { tree: TreeListResponse } = await prompts({
    type: "autocomplete",
    name: "tree",
    message: "Pick a tree",
    choices: (await client.list())
      .map((resource) => ({ title: resource.name, value: resource }))
      .sort((a, b) => a.title.localeCompare(b.title))
  });

  const { timeGrain } = await prompts({
    type: "autocomplete",
    name: "timeGrain",
    message: "Pick a time grain",
    choices: tree.timeGrain.map((timeGrain) => {
      return {
        title: timeGrain,
        value: timeGrain
      };
    })
  });

  return {
    treeId: tree.id,
    timeGrain
  };
}

export function promptNode<T>(
  tree: Tree<T>,
  options: { arithmeticOnly?: boolean } = {}
) {
  const { arithmeticOnly = true } = options;

  let target: Subtree<T>;
  if (arithmeticOnly) {
    target = arithmeticTree(tree);
  } else {
    target = tree;
  }

  const ordered: {
    node: NodeId;
    attributes: TreeNodeType<T>;
    depth: number;
  }[] = [];
  bfsFromNode(target, rootNode(target), (node, attributes, depth) => {
    ordered.push({ node, attributes, depth });
  });

  return prompts({
    type: "autocomplete",
    name: "node",
    message: "Pick a tree node",
    initial: rootNode(target),
    choices: ordered.map(({ node, attributes, depth }) => {
      return {
        title: `${attributes.label} ${`${depth}`.padStart(60 - attributes.label.length, " ")}`,
        value: node
      };
    })
  });
}
