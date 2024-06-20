import { ComparisonResult, ValueFormat } from "../types";

export function sumComparisonResults(arr: ComparisonResult<number>[]) {
  const befores: Date[] = [];
  const afters: Date[] = [];

  let sum = 0;
  let sumIsNull = false;
  for (const { before, after, value } of arr) {
    befores.push(before);
    afters.push(after);

    if (value == null) {
      sumIsNull = true;
      break;
    }

    sum += value;
  }

  // TODO: Should check if befores/afters have (1) unique value
  const before = befores[0];
  const after = afters[0];

  if (sumIsNull) {
    return { before, after, value: null, format: ValueFormat.Percent };
  } else {
    return { before, after, value: sum, format: ValueFormat.Percent };
  }
}
