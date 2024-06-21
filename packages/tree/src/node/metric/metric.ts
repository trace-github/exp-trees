import { CubeSeries, EmptyCubeSeries, IArtifactReader } from "@trace/artifacts";
import { Observable, of, shareReplay } from "rxjs";
import { rxCubeSeriesTransform } from "../../transform/transform";
import { nodeByType } from "../../tree";
import { NodeId, NodeType, Subtree } from "../../types";

export function rxMetric(
  artifacts: IArtifactReader,
  tree: Subtree<CubeSeries>,
  node: NodeId
): Observable<CubeSeries> {
  const attributes = nodeByType(tree, node, NodeType.Metric);

  if (!attributes) return of(EmptyCubeSeries);

  const { metricName, timeGrain, series, transform = [] } = attributes;

  return artifacts.cubeSeries({ metricName, series, timeGrain }).pipe(
    // Transform the series based on the node configuration.
    rxCubeSeriesTransform(metricName, transform),

    // NOTE: This is important. Edges will subscribe to the series. The
    // above transform is an expensive operation.
    shareReplay(1)
  );
}
