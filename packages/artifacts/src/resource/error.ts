export class ResourceError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static FailedTypecheck = new ResourceError("Failed typecheck");
}
