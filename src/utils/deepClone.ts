const isPlainObject = (value: object): boolean => {
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
};

export function deepClone<T>(source: T): T {
  if (source === null || typeof source !== "object") {
    return source;
  }

  if (Array.isArray(source)) {
    return source.map((item) => deepClone(item)) as unknown as T;
  }
  if (!isPlainObject(source)) {
    return source;
  }
  const clone: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    clone[key] = deepClone(value);
  }
  return clone as unknown as T;
}
