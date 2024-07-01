export class TreeError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static NoSuchEdge = new TreeError("No such edge.");

  public static TooManyEdges = new TreeError("Too many edges.");
}
