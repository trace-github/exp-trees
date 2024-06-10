import { CubeTimeGrain } from "@trace/artifacts";
import { ITreeClient, TreeListResponse } from "@trace/tree";
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
