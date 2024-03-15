export function toError(error: unknown): Error {
  try {
    if (error instanceof Error) return error;
    return new Error(String(error));
  } catch (err) {
    return toError(err);
  }
}
