export function isFalsy(
  value: unknown
): value is false | "" | 0 | null | undefined {
  return !value;
}
