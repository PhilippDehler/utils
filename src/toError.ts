function decycle(obj: unknown, stack: object[] = []): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (stack.includes(obj)) return null;
  const s = stack.concat([obj]);
  return Array.isArray(obj)
    ? obj.map((x) => decycle(x, s))
    : Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k, decycle(v, s)])
      );
}

export function toError(error: unknown): Error {
  try {
    if (error instanceof Error) return error;
    return new Error(JSON.stringify(decycle(error)));
  } catch (err) {
    return toError(err);
  }
}
