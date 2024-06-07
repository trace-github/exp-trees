import { CubeTimeGrain } from "@trace/artifacts";
import { ITreeClient, TreeConfig, TreeListResponse } from "@trace/tree";
import prompts from "prompts";

export async function promptTree(client: ITreeClient): Promise<TreeConfig> {
  const { tree: group }: { tree: TreeListResponse } = await prompts({
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
    choices: group.timeGrain.map((timeGrain) => {
      return {
        title: timeGrain,
        value: timeGrain
      };
    })
  });

  const { config } = await client.tree(group.id, timeGrain as CubeTimeGrain);

  return config;
}
