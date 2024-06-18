export class TreeNodeError extends Error {
  private constructor(message?: string) {
    super(message);
  }

  public static CubeSeriesDoesNotHaveRequestedRow = new TreeNodeError(
    "CubeSeries does not have request row"
  );

  public static UnexpectedNullRow = new TreeNodeError("Unexpected null row");

  public static EvaluationInputIsEmpty = new TreeNodeError(
    "Evaluation input is empty"
  );
}
