import fs from "node:fs";

export function fileExists(
  path: string | undefined | null,
  options: { acceptDirectory?: boolean } = {}
): boolean {
  if (path == undefined || path == null) return false;

  const { acceptDirectory = false } = options;
  const stat = fs.statSync(path, { throwIfNoEntry: false });

  if (!stat) return false;

  return stat.isFile() || (acceptDirectory && stat.isDirectory());
}

export function dirExists(path: string | undefined | null): boolean {
  if (path == undefined || path == null) return false;

  const stat = fs.statSync(path, { throwIfNoEntry: false });

  if (!stat) return false;

  return stat.isDirectory();
}
