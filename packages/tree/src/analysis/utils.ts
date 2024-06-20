// if (!tree.hasEdge(edge)) throw AnalysisError.MissingEdge;

import { EdgeId, Subtree } from "../types";
import { AnalysisError } from "./errors";

export function edgeData<T>(tree: Subtree<T>, edge: EdgeId) {
  if (!tree.hasEdge(edge)) throw AnalysisError.MissingEdge;

  const attributes = tree.getEdgeAttributes(edge);
  const [source, target] = tree.extremities(edge);

  if (!tree.hasNode(source)) throw AnalysisError.MissingNode;
  const sourceAttributes = tree.getNodeAttributes(source);

  if (!tree.hasNode(target)) throw AnalysisError.MissingNode;
  const targetAttributes = tree.getNodeAttributes(target);

  return {
    edge,
    attributes,
    source,
    sourceAttributes,
    target,
    targetAttributes
  };
}
