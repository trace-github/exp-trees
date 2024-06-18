import { compareAsc, compareDesc, isBefore, isEqual } from "date-fns";

/**
 * Returns a sorted array of unique dates.
 * @param arr - The array of dates to process.
 * @param options - Sorting options.
 * @param options.sort - The sorting order, either "asc" or "desc".
 * @returns An array of unique dates, optionally sorted.
 */
export function unique(
  arr: Date[],
  options: { sort?: "asc" | "desc" | "none" } = {}
): Date[] {
  const { sort = "none" } = options;
  const result: Date[] = [];
  const seen = new Set<number>();
  for (const date of arr) {
    const t = date.getTime();
    if (seen.has(t)) continue;
    result.push(date);
    seen.add(t);
  }

  switch (sort) {
    case "asc":
      result.sort(compareAsc);
      break;
    case "desc":
      result.sort(compareDesc);
      break;
    case "none":
      break;
  }

  return result;
}

/**
 * Compares multiple arrays of dates for equality.
 *
 * @param first - The first array of dates to compare.
 * @param rest - The rest of the arrays to compare against the first.
 * @returns `true` if all arrays contain the same dates in the same order, `false` otherwise.
 */
export function equalArrays(first: Date[], ...rest: Date[][]): boolean {
  if (rest.length == 0) return true;

  for (const other of rest) {
    if (first.length != other.length) {
      return false;
    }

    const equal = first.every((date, i) => isEqual(date, other[i]));

    if (!equal) {
      return false;
    }
  }

  return true;
}

/**
 * Finds the index of a specific date in a sorted array of dates.
 *
 * @param sortedArray - The sorted array of dates to search in.
 * @param dateToFind - The date to find.
 * @returns The index of the date if found, otherwise -1.
 */
export function findIndexForEqualDate(
  sortedArray: Date[],
  dateToFind: Date
): number {
  let left = 0;
  let right = sortedArray.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const middleDate = sortedArray[middle];

    if (isEqual(middleDate, dateToFind)) {
      return middle;
    }

    if (isBefore(middleDate, dateToFind)) {
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }

  return -1;
}
