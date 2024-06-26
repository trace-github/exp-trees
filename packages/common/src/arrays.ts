export function filterNulls<T>(arr: (T | null)[]): T[] {
  return arr.filter((d: T | null): d is T => d != null);
}

export function filterUndefined<T>(arr: (T | undefined)[]): T[] {
  return arr.filter((d: T | undefined): d is T => d != undefined);
}

export function filterEmpty<T>(
  arr: (T | undefined | null)[]
): NonNullable<T>[] {
  return arr.filter(
    (d: T | undefined | null): d is NonNullable<T> =>
      d != undefined && d != null && d != ""
  );
}
