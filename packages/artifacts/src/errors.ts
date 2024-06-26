export class ArtifactError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static UnexpectedEmptyTable = new ArtifactError(
    "Unexpected empty table."
  );
}
