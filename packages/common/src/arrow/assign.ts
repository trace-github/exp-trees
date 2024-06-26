import * as Arrow from "apache-arrow";

/**
 * Combines multiple Apache Arrow `Table` instances into a single `Table`.
 * The function merges the columns of the provided tables, with subsequent
 * tables' columns being added to the right of the preceding table's columns.
 * If a column exists in multiple tables, the column from the last table
 * containing that column name is used in the final table. If the input array
 * is empty, an empty `Table` instance is returned.
 *
 * @param {Arrow.Table[]} tables - An array of Apache Arrow `Table` instances to be combined.
 * @returns {Arrow.Table} - A new `Table` instance that is the result of combining the input tables.
 * If `tables` is empty, returns an empty `Table`.
 */
export function assign(tables: Arrow.Table[]): Arrow.Table {
  if (tables.length == 0) {
    return new Arrow.Table();
  }

  let result = tables[0];
  const rest = tables.slice(1);
  for (const curr of rest) {
    result = result.assign(curr);
  }

  return result;
}
