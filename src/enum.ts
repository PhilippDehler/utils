type Member = string | number;
type EnumObject<T extends readonly Member[]> = {
  [K in T[number]]: K;
};

type Guards<T extends readonly Member[]> = {
  [K in T[number] as `is${Capitalize<`${K}`>}`]: (value: unknown) => value is K;
} & {
  isMember: (value: unknown) => value is T[number];
  hasPropertyOf: <
    TObject extends object,
    Key extends keyof TObject,
    Value extends TObject[Key] & T[number]
  >(
    obj: TObject,
    prop: Key,
    value: Value
  ) => obj is Extract<TObject, { [K in Key]: Value }>;
};

interface Utils<T extends readonly Member[]> {
  /**
   * Matches a value to a corresponding handler in the matcher object.
   * If no match is found, the 'otherwise' handler is called.
   *
   * @param matcher - An object where each key is a member of T and has a corresponding handler function.
   * @returns A function that takes a value and returns the result of the matched handler or 'otherwise'.
   *
   * @example
   * const matcher = Enum.fromArray(["A", "B", "C"]).match({
   *  A: () => "A",
   * B: () => "B",
   * otherwise: () => "C",
   * });
   * matcher("A"); // "A"
   * matcher("B"); // "B"
   * matcher("C"); // "C"
   * matcher("D"); // "C"
   *
   * */
  match: <
    Matcher extends { [K in T[number]]?: () => unknown } & {
      otherwise: (v: any) => unknown;
    }
  >(
    matcher: Matcher
  ) => (
    value: unknown
  ) =>
    | ReturnType<Matcher[keyof Matcher] & {}>
    | ReturnType<Matcher["otherwise"]>;
  /**
   * Matches a value to a corresponding handler in the matcher object.
   * If no match is found, an error is thrown.
   *
   * @param matcher - An object where each key is a member of T and has a corresponding handler function.
   * @returns A function that takes a value and returns the result of the matched handler or throws an error.
   * @example
   * //NOTE: Typescript error due to missing handler for "C" this would be caught at compile time.
   * const matcher = Enum.fromArray(["A", "B", "C"]).with({
   * A: () => "A",
   * B: () => "B",
   * });
   * matcher("A"); // "A"
   * matcher("B"); // "B"
   * matcher("C"); // Error: Expected enum member: [A, B, C]. Received: C
   * matcher("D"); // Error: Expected enum member: [A, B, C]. Received: D
   */
  with: <Strategy extends { [K in T[number]]: (key: K) => unknown }>(
    args: Strategy
  ) => <Val extends T[number]>(value: Val) => ReturnType<Strategy[Val]>;
  /**
   * Enforces to input an object with all members of the enum as keys.
   * Returns the same object.
   *
   * @example
   * const enumObject = Enum.fromArray(["A", "B", "C"]);
   * const mappedEnum = enumObject.mapValues({
   * A: 1,
   * B: 2,
   * C: 3,
   * });
   * // mappedEnum is {A: 1, B: 2, C: 3}
   *
   */
  mapValues: <const X extends { [K in keyof EnumObject<T>]: unknown }>(
    mappedEnum: X
  ) => X;
  values: () => T;

  guards: Guards<T>;
}

export type Enum<T extends readonly Member[]> = EnumObject<T> & Utils<T>;

const guardKey = <const T extends Member>(m: T): `is${Capitalize<`${T}`>}` =>
  `is${m.toString()[0]!.toUpperCase()}${m.toString().slice(1)}` as any;
function initGuards<T extends readonly Member[]>(
  memberSet: Set<T[number]>
): Guards<T> {
  const guards: any = {
    isMember: (value: unknown): value is T[number] =>
      memberSet.has(value as any),
  } as any;
  for (const member of memberSet.values()) {
    const key = guardKey(member);
    if (guards[key]) throw new Error("Enum init error.");
    guards[key] = ((value: unknown) => member === value) as any;
  }
  guards["hasPropertyOf"] = hasPropertyOf;

  return guards as Guards<T>;
}

export function fromArray<const T extends readonly Member[]>(
  members: T
): Enum<T> {
  const set = new Set(members);
  const membersAsEnumObject: EnumObject<T> = Object.fromEntries(
    [...set].map((m) => [m, m] as const)
  ) as any;
  const enumUtils: Utils<T> = {
    match: (matcher: any) => (value: any) =>
      matcher[value]?.() ?? matcher.otherwise(value),
    with: (matcher: any) => (value: any) =>
      matcher[value]?.(value) ??
      (() => {
        throw new Error(
          `Expected enum member: [${members.join(", ")}]. Received:${value}`
        );
      })(),
    values: () => members,
    mapValues: <const X extends { [K in keyof EnumObject<T>]: unknown }>(
      mappedEnum: X
    ) => mappedEnum,
    guards: initGuards(set),
  };
  return Object.assign(membersAsEnumObject, enumUtils);
}

export type Infer<T extends Enum<any>> = T extends Enum<
  infer U extends readonly Member[]
>
  ? U[number]
  : never;

function hasPropertyOf<T, Key extends keyof T, Value extends T[Key]>(
  obj: T,
  prop: Key,
  value: Value
): obj is Extract<T, { [K in Key]: Value }> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    prop in obj &&
    obj[prop] === value
  );
}
