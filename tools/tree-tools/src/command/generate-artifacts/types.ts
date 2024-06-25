import { CubeSeries } from "@trace/artifacts";
import { EdgeId, EdgeType, Subtree, Tree, TreeEdgeType } from "@trace/tree";
import { Observable } from "rxjs";

export interface GenerateArtifactsArguments {
  customer: string;
  workspace?: string;
  workdir: string;
}

/** App Specific Resolver  **/

export type ComparisonEdgeFunc = (
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  edge: EdgeId,
  config$: Observable<[Date, Date]>
) => TreeEdgeType<CubeSeries, EdgeType.Analysis>;

export type EdgePredicate = (
  tree: Tree<CubeSeries> | Subtree<CubeSeries>,
  edge: EdgeId,
  attributes: TreeEdgeType<CubeSeries>
) => boolean;
