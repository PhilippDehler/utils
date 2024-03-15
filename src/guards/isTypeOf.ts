type Type = (typeof typesOf)[number];
const typesOf = [
  "string",
  "number",
  "bigint",
  "boolean",
  "symbol",
  "undefined",
  "object",
  "function",
] as const;

type TypeMap = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  symbol: Symbol;
  undefined: undefined;
  object: Record<PropertyKey, unknown>;
  function: (...args: any[]) => any;
};

export function isTypeOf<Types extends [Type, ...Type[]]>(
  i: unknown,
  ...args: Types
): i is TypeMap[Types[number]] {
  const type = typeof i;
  return args.some((t) => t === type);
}
