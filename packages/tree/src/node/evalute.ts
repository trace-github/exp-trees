import { CubeSeries } from "@trace/artifacts";

export function rowScope(
  inputs: { [key: string]: CubeSeries },
  rowIdx: number
): { [key: string]: number | null } {
  const result: { [key: string]: number | null } = {};
  for (const [name, series] of Object.entries(inputs)) {
    const value = series.get(rowIdx)?.value;
    if (value != undefined && value != null) {
      result[name] = Number(value);
    } else {
      result[name] = null;
    }
  }
  return result;
}
