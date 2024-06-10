import { CubeTimeGrain, IResourceReader } from "@trace/artifacts";
import { MultiDirectedGraph } from "graphology";
import { firstValueFrom } from "rxjs";
import { TreeConfig } from "../types";
import {
  ITreeClient,
  TreeListResponse,
  TreeResourceId,
  TreeResponse
} from "../types-resource";
import { LegacyTreeCatalog } from "./types";
import { isLegacyTreeCatalog } from "./types.guard";

export async function initLegacyTrees(
  reader: IResourceReader,
  workspace: string
) {
  const treesList = await firstValueFrom(
    reader.json(`${workspace}/trees/trees.json`, isLegacyTreeCatalog)
  );
  return new LegacyTreeClient(reader, treesList);
}
export class LegacyTreeClient implements ITreeClient {
  private readonly data: LegacyTreeCatalog;
  private readonly reader: IResourceReader;

  constructor(reader: IResourceReader, data: LegacyTreeCatalog) {
    this.reader = reader;
    this.data = data;
  }

  async list(id?: TreeResourceId): Promise<TreeListResponse[]> {
    return this.data.metrics
      .filter((curr) => {
        return !curr.hideInNavigation;
      })
      .filter((curr) => {
        if (id == undefined) return true;
        return curr.groupId == id;
      })
      .map((curr) => {
        return {
          id: curr.groupId,
          name: curr.label,
          timeGrain: curr.tree
            .map(({ timeGrain }) => timeGrain)
            .filter((timeGrain): timeGrain is CubeTimeGrain => {
              return !!timeGrain;
            })
        };
      });
  }

  async tree(
    id: TreeResourceId,
    timeGrain: CubeTimeGrain
  ): Promise<TreeResponse> {
    const group = this.data.metrics.find((curr) => curr.groupId == id);

    if (!group) throw "No such tree.";

    const tree = group.tree.find((curr) => curr.timeGrain == timeGrain);

    if (!tree) throw "No such tree (timeGrain).";

    const json = await firstValueFrom(this.reader.json(tree.path));

    // TODO (ak): Need to find a way to validate the json.
    let config: TreeConfig = new MultiDirectedGraph();
    config = config.import(json as any);

    return { config };
  }
}
