import { CubeSeries, EmptyCubeSeries, IArtifactReader } from "@trace/artifacts";
import { Observable, of } from "rxjs";
import { nodeByType } from "../../tree";
import { NodeId, NodeType, Subtree } from "../../types";

export function rxMetric(
  artifacts: IArtifactReader,
  tree: Subtree<CubeSeries>,
  node: NodeId
): Observable<CubeSeries> {
  const attributes = nodeByType(tree, node, NodeType.Metric);

  if (!attributes) return of(EmptyCubeSeries);

  const series = artifacts.cubeSeries({
    metricName: attributes.metricName,
    timeGrain: attributes.timeGrain,
    series: attributes.series
  });

  return series;
}
