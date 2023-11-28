export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? true
  : false;

export type Print<T> = [T] extends [never]
  ? `never`
  : Equals<T, unknown> extends true
  ? "unknown"
  : Equals<T, any> extends true
  ? "any"
  : T extends string
  ? `${T}`
  : T extends number
  ? `${T}`
  : T extends bigint
  ? `${T}n`
  : T extends boolean
  ? `${T}`
  : T extends symbol
  ? `Symbol`
  : T extends void
  ? `void`
  : T extends undefined
  ? `undefined`
  : T extends null
  ? "null"
  : T extends object
  ? T extends any[]
    ? PrintArray<T>
    : T extends (...args: infer Args) => infer Result
    ? `(...${Print<Args>}) => ${Print<Result>}`
    : "[Object object]"
  : never;

type PrintArray<T extends unknown[], Agg extends string = "["> = T extends [
  infer Head,
  ...infer Tail
]
  ? PrintArray<Tail, `${Agg}${Agg extends "[" ? "" : ", "}${Print<Head>}`>
  : `${Agg}]`;

export type Maybe<T> = T | null | undefined;
