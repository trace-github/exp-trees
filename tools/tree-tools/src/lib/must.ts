export function must(ok: boolean, errorIfFalse: Error | string) {
  if (!ok) throw errorIfFalse;
  return;
}
