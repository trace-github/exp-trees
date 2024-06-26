/**
 * Trims specified characters from the start and end of a string.
 *
 * @param input - The input string to trim.
 * @param cutSet - A string containing characters to trim from the input.
 * @returns The trimmed string.
 *
 * @example
 * ```typescript
 * trimCharacters('"Hello World"', `"'`);
 * // Output: Hello World
 *
 * trimCharacters('...Hello World...', '.');
 * // Output: Hello World
 * ```
 */
export function trim(input: string, cutSet: string): string {
  const escapedCutSet = cutSet.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`^[${escapedCutSet}]+|[${escapedCutSet}]+$`, "g");
  return input.replace(regex, "");
}
