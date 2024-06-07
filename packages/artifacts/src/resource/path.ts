export function pathJoin(...args: string[]): string {
  return args.map((str) => str.replace(/\/+$/, "")).join("/");
}
