import { CubeSeries, EmptyCubeSeries, IArtifactReader } from "@trace/artifacts";
import { Observable, of } from "rxjs";
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

  return artifacts
    .cubeSeries({ metricName, series, timeGrain })
    .pipe(rxCubeSeriesTransform(metricName, transform));
}
