import { EdgeId, NodeId } from "../types";

export class TreeVisitorError extends Error {
  private constructor(message?: string | undefined) {
    super(message);
  }

  public static newUnexpectedNodeError(node: NodeId) {
    const message = `Unexpected node: ${node}`;
    return new TreeVisitorError(message);
  }

  public static newUnexpectedEdgeError(edge: EdgeId) {
    const message = `Unexpected edge: ${edge}`;
    return new TreeVisitorError(message);
  }
}
