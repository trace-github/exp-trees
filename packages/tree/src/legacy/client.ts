import { CubeTimeGrain, IResourceReader, ResourceURL } from "@trace/artifacts";
import { MultiDirectedGraph } from "graphology";
import { TreeConfig } from "../types";
import {
  ITreeClient,
  TreeListResponse,
  TreeResourceId,
  TreeResponse
} from "../types-resource";
import { LegacyTreeCatalog } from "./types";
import { isLegacyTreeCatalog } from "./types.guard";

export class LegacyTreeClient implements ITreeClient {
  private readonly data: LegacyTreeCatalog;
  private readonly reader: IResourceReader;

  private constructor(reader: IResourceReader, data: LegacyTreeCatalog) {
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

    const json = await this.reader.json(tree.path);

    // TODO (ak): Need to find a way to validate the json.
    let config: TreeConfig = new MultiDirectedGraph();
    config = config.import(json as any);

    return { config };
  }

  public static async from(reader: IResourceReader, target: ResourceURL) {
    const treesList = await reader.json(target, isLegacyTreeCatalog);
    return new LegacyTreeClient(reader, treesList);
  }
}
