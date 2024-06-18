export class CommonError extends Error {
  private constructor(message?: string | undefined) {
    super(message);
  }

  public static NotImplemented = new CommonError("Not implemented.");
}
