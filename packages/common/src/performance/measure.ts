export async function markAndMeasure<T>(
  name: string,
  value: Promise<T> | T
): Promise<T> {
  let prom: Promise<T>;
  if (value instanceof Promise) {
    prom = value;
  } else {
    prom = Promise.resolve(value);
  }

  const startMarker = `${name}-start`;
  const endMaker = `${name}-end`;

  performance.mark(startMarker);
  return prom.finally(() => {
    performance.mark(endMaker);
    performance.measure(name, startMarker, endMaker);
  });
}
