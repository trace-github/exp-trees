export function measure(name: string) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const start = `${name}-start`;
    const end = `${name}-end`;

    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      performance.mark(start);
      const result = originalMethod.apply(this, args);
      performance.mark(end);
      performance.measure(name, start, end);
      return result;
    };

    return descriptor;
  };
}
