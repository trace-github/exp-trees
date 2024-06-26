export class ResourceError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static FailedTypecheck = new ResourceError("Failed typecheck");

  public static Not2xxResponse = new ResourceError("Non-2xx response");
}
