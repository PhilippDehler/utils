namespace Enum {
  export type Member = string | number;
  export type Object<T extends readonly Member[]> = {
    [K in T[number]]: K;
  };

  type Guards<T extends readonly Member[]> = {
    [K in T[number] as `is${Capitalize<`${K}`>}`]: (
      value: unknown
    ) => value is K;
  } & { isMember: (value: unknown) => value is T[number] };

  interface Utils<T extends readonly Member[]> {
    match: <
      Matcher extends { [K in T[number]]: () => unknown } & {
        otherwise: (v: any) => unknown;
      }
    >(
      matcher: Matcher
    ) => (value: unknown) => ReturnType<Matcher[keyof Matcher]>;
    with: <Strategy extends { [K in T[number]]: () => unknown }>(
      args: Strategy
    ) => <Val extends T[number]>(value: Val) => ReturnType<Strategy[Val]>;
    mapValues: <const X extends { [K in keyof Enum.Object<T>]: unknown }>(
      mappedEnum: X
    ) => X;
    values: () => T;
    guards: Guards<T>;
  }

  export type Enum<T extends readonly Member[]> = Enum.Object<T> & Utils<T>;

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
    return guards as Guards<T>;
  }

  export function fromArray<const T extends readonly Member[]>(
    members: T
  ): Enum<T> {
    const set = new Set(members);
    const membersAsEnumObject: Object<T> = Object.fromEntries(
      [...set].map((m) => [m, m] as const)
    ) as any;
    const enumUtils: Utils<T> = {
      match: (matcher: any) => (value: any) =>
        matcher[value]?.() ?? matcher.otherwise(value),
      with: (matcher: any) => (value: any) =>
        matcher[value]?.() ??
        (() => {
          throw new Error(
            `Expected enum member: [${members.join(", ")}]. Received:${value}`
          );
        })(),
      values: () => members,
      mapValues: <const X extends { [K in keyof Object<T>]: unknown }>(
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
}
