import { EdgeId } from "../types";

export class AnalysisError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static missingEdge(edge: EdgeId) {
    return new AnalysisError(`Missing Edge: ${edge}.`);
  }

  public static InvalidSeries = new AnalysisError("Invalid series.");

  public static MalformedSeries = new AnalysisError("Malformed series.");

  public static MissingEdge = new AnalysisError("Missing edge.");

  public static UnexpectedEdgeType = new AnalysisError("Unexpected edge type.");

  public static MissingNode = new AnalysisError("Missing node.");

  public static UnexpectedNodeType = new AnalysisError("Unexpected node type.");
}
