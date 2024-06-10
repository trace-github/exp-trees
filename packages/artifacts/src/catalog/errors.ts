export class CatalogError extends Error {
  private constructor(message: string) {
    super(message);
  }

  public static ResourceNotFound = new CatalogError("Resource not found.");
}
