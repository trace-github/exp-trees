import { EdgeId, NodeId } from "../types";

export class AnalysisError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static MissingEdge = new AnalysisError("Missing edge.");

  public static missingEdge(edge: EdgeId) {
    return new AnalysisError(`Missing Edge: ${edge}.`);
  }

  public static MissingNode = new AnalysisError("Missing node.");

  public static missingNode(node: NodeId) {
    return new AnalysisError(`Missing Node: ${node}.`);
  }

  public static InvalidSeries = new AnalysisError("Invalid series.");

  public static MalformedSeries = new AnalysisError("Malformed series.");

  public static UnexpectedEdgeType = new AnalysisError("Unexpected edge type.");

  public static UnexpectedNodeType = new AnalysisError("Unexpected node type.");
}
