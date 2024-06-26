export function join(...args: string[]): string {
  return args.map((str) => str.replace(/\/+$/, "")).join("/");
}
