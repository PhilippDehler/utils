export function isKeyOf<const Key extends PropertyKey>(
  obj: unknown,
  key: Key
): obj is { [K in Key]: unknown } {
  return !!obj && typeof obj === "object" && key in obj;
}
