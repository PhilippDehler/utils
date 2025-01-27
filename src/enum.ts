type Member = string | number;
type Pretty<T> = { [K in keyof T]: T[K] };

/**
 * Infers the type of members of an enum.
 *
 * @example
 * type ColorEnum = Enum<'Red' | 'Green' | 'Blue'>;
 * type Colors = InferEnum<ColorEnum>; // 'Red' | 'Green' | 'Blue'
 */
export type InferEnum<T extends Enum<any>> = T extends Enum<
  infer U extends Member
>
  ? U
  : never;

/**
 * Represents an object where the keys and values are members of the enum.
 *
 * @example
 * type ColorEnum = EnumObject<'Red' | 'Green' | 'Blue'>;
 * // Equivalent to:
 * // { Red: 'Red'; Green: 'Green'; Blue: 'Blue'; }
 */
type EnumObject<T extends Member> = {
  [K in T]: K;
};

/**
 * Provides a set of type guard functions for each member of an enum.
 * Each function is named `is${Member}` where `Member` is the capitalized name of the enum member.
 *
 * @template T - The enum type whose members will be used to generate the type guard functions.
 *
 * @example
 * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
 *
 * Colors.guards.isRed('Red'); // true
 * Colors.guards.isGreen('Blue'); // false
 * Colors.guards.isBlue('Blue'); // true
 */
type ValueGuards<T extends Member> = {
  [K in T as `is${Capitalize<`${K}`>}`]: (value: unknown) => value is K;
};

/**
 * Common type guard methods for enums.
 *
 * @template T - Enum member type.
 *
 * @example
 * const guards = createGuards(new Set(['Red', 'Green', 'Blue']));
 * guards.isMember('Red'); // true
 * guards.isVariant({ color: 'Red' }, 'color', 'Red'); // true
 */
interface CommonGuards<T extends Member> {
  /**
   * Checks if a given value is a member of the enum.
   *
   * @template T - The type of the enum member.
   * @param value - The value to check.
   * @returns `true` if the value is a valid member of the enum, otherwise `false`.
   *
   * @example
   * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
   *
   * Colors.guards.isMember('Red'); // true
   * Colors.guards.isMember('Yellow'); // false
   */
  isMember(value: unknown): value is T;
  /**
   * Checks if an object has a specific key-value pair, where the value is a member of the enum.
   *
   * @param obj - The object to check.
   * @param Key - The key in the object to validate.
   * @param value - The expected value of the key, which must match an enum member.
   * @returns `true` if the object contains the specified key-value pair, otherwise `false`.
   *
   * @example
   * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
   * const obj = { color: 'Red' };
   *
   * Colors.guards.isVariant(obj, 'color', 'Red'); // true
   * Colors.guards.isVariant(obj, 'color', 'Blue'); // false
   */
  isVariant<
    TObject extends object,
    Key extends keyof TObject,
    Value extends TObject[Key] & T
  >(
    obj: TObject,
    Key: Key,
    value: Value
  ): obj is Extract<TObject, { [K in Key]: Value }>;
}

type Guards<T extends Member> = ValueGuards<T> & CommonGuards<T>;

/**
 * Represents an enhanced enum with guards and utilities.
 *
 * @template T - The type of enum members.
 *
 * @example
 * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
 * Colors.Red; // 'Red'
 * Colors.guards.isRed('Red'); // true
 * Colors.utils.toArray(); // ['Red', 'Green', 'Blue']
 */
type Enum<T extends Member> = Pretty<
  EnumObject<T> & {
    guards: Guards<T>;
    utils: {
      /**
       * Returns an iterator that contains the values of the enum.
       * @returns An iterator containing the enum values.
       * @example
       * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
       * for (const color of Colors.utils.values()) {
       *  console.log(color);
       * }
       * // Output:
       * // Red
       * // Green
       * // Blue
       */
      values: () => IterableIterator<T>;
      /**
       * Maps the enum members to a different set of values.
       * @param mappedEnum - An object that maps the enum members to new values.
       * @returns The mapped enum object.
       * @example
       * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
       * const mappedColors = Colors.utils.strategy({
       * Red: 'R',
       * Green: 'G',
       * Blue: 'B',
       * });
       * mappedColors.Red; // 'R'
       *
       * const stragety = Colors.utils.strategy({
       * Red: ()=> 'R',
       * Green: ()=> 'G',
       * Blue: ()=> 'B',
       * });
       * stategy.Red(); // 'R'
       *
       */
      strategy: <Strategy extends { [K in keyof EnumObject<T>]: unknown }>(
        mappedEnum: Strategy
      ) => Strategy;
      /**
       * Returns the enum members as an array.
       * @returns An array containing the enum members.
       * @example
       * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
       * Colors.utils.toArray(); // ['Red', 'Green', 'Blue']
       */
      toArray: () => T[];
      /**
       * A pattern matcher for the enum.
       * @example
       * const Colors = Enum.fromArray(['Red', 'Green', 'Blue']);
       * const result = Colors.utils.pattern
       *  .match({ on: ['Red'], do: () => 'red' })
       * .match({ on: ['Green'], do: () => 'green' })
       * .match({ on: ['Blue'], do: () => 'blue' })
       * .otherwise(() => 'unknown');
       * result('Red'); // 'red'
       * result('Green'); // 'green'
       * result('Blue'); // 'blue'
       * result('Yellow'); // 'unknown'
       *
       * const result = Colors.utils.pattern
       * .match({ on: ['Red'], do: () => 'red' })
       * .match({ on: ['Green'], do: () => 'green' })
       * .exhaustive(); // Error: Non-exhaustive match.
       *
       */
      pattern: Matcher<T, []>;
    };
  }
>;

function guardKey<T extends Member>(m: T): `is${Capitalize<`${T}`>}` {
  return `is${m.toString()[0]!.toUpperCase()}${m.toString().slice(1)}` as any;
}

/**
 * Creates a set of type guard functions and utilities for the given enum members.
 *
 * @template T - The type of the enum members.
 * @param members - A set of enum members.
 * @returns An object containing type guards and common utilities.
 *
 * @example
 * const guards = createGuards(new Set(['Red', 'Green', 'Blue']));
 * guards.isRed('Red'); // true
 * guards.isMember('Blue'); // true
 * guards.isVariant({ color: 'Red' }, 'color', 'Red'); // true
 */
const createGuards = <T extends Member>(members: Set<T>): Guards<T> => {
  return {
    ...(Object.fromEntries(
      members
        .values()
        .map(
          (member) =>
            [guardKey(member), (value: unknown) => member === value] as const
        )
        .toArray()
    ) as any),
    isMember: (value: unknown): value is T => members.has(value as any),
    isVariant: <
      TObject extends object,
      Key extends keyof TObject,
      Value extends TObject[Key] & T
    >(
      obj: TObject,
      Key: Key,
      value: Value
    ): obj is Extract<TObject, { [K in Key]: Value }> =>
      typeof obj === "object" &&
      obj !== null &&
      Key in obj &&
      obj[Key] === value,
  };
};

const enumObject = <T extends Member>(members: Set<T>): EnumObject<T> => {
  return Object.fromEntries(
    members.values().map((member) => [member, member] as const)
  ) as EnumObject<T>;
};

function fromArray<const T extends Member>(members: T[]): Enum<T> {
  const memberSet = new Set(members);
  return Object.defineProperties(enumObject(memberSet) as any as Enum<T>, {
    guards: {
      configurable: false,
      enumerable: false,
      writable: false,
      value: createGuards(memberSet),
    },
    utils: {
      value: {
        values: () => memberSet.values(),
        strategy: <TStrategy extends { [K in keyof EnumObject<T>]: unknown }>(
          mappedEnum: TStrategy
        ) => mappedEnum,
        toArray() {
          return memberSet.values().toArray();
        },
        get pattern() {
          return new Matcher<T, []>([]);
        },
      },
      enumerable: false,
      writable: false,
      configurable: false,
    },
  });
}

function fromObject<T extends Record<string, any>>(members: T) {
  return fromArray<keyof T & string>(Object.keys(members));
}

export const Enum = {
  fromArray,
  fromObject,
};

type BaseMatcher<T = any, Do = any> = {
  on: T[];
  do: () => Do;
};
class Matcher<Members extends Member, const M extends BaseMatcher[]> {
  constructor(private matcher: M) {}
  match<
    Match extends BaseMatcher<Exclude<Members, M[number]["on"][number]>, any>
  >(args: Match) {
    return new Matcher<Members, [...M, Match]>([...this.matcher, args]);
  }

  otherwise<Do>($do: () => Do) {
    return (value: unknown): ReturnType<M[number]["do"]> | Do => {
      for (const { on, do: $do } of this.matcher) {
        if (on.includes(value as any)) return $do();
      }
      return $do();
    };
  }
  exhaustive(
    ..._: [Exclude<Members, M[number]["on"][number]>] extends [never]
      ? []
      : [
          `Exhaustive check fails for: ${Exclude<
            Members,
            M[number]["on"][number]
          >}`
        ]
  ): (value: unknown) => ReturnType<M[number]["do"]> {
    return ((value: unknown): ReturnType<M[number]["do"]> => {
      for (const { on, do: $do } of this.matcher) {
        if (on.includes(value as any)) return $do();
      }
      throw new Error("Non-exhaustive match. Received: " + value);
    }) as any;
  }
}
