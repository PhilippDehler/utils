export function toError(error: unknown): Error {
  try {
    if (error instanceof Error) return error;
    return new Error(String(error));
  } catch (err) {
    return toError(err);
  }
}

export function tryCatch<T>(fn: () => T): [T, null] | [null, Error] {
  try {
    return [fn(), null];
  } catch (error) {
    return [null, toError(error)];
  }
}

export function tryCatchAsync<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  return fn()
    .then((val): [T, null] => [val, null] as const)
    .catch((error): [T | null, Error] => [null, toError(error)] as const) as any;
}

export function exeption<T>(error: () => never): never {
  throw error();
}
