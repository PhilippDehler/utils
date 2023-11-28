import { AnyFn } from "./type";

export type Curry<Fn extends AnyFn> = Parameters<Fn> extends [
  infer First,
  ...infer Rest
]
  ? (arg: First) => Curry<(...rest: Rest) => ReturnType<Fn>>
  : ReturnType<Fn>;

export function curry<T extends AnyFn, TAgg extends unknown[]>(
  func: T,
  agg?: TAgg
): Curry<T> {
  const aggregatedArgs = agg ?? [];
  if (func.length === aggregatedArgs.length) return func(...aggregatedArgs);
  return ((arg: any) => curry(func, [...aggregatedArgs, arg])) as any;
}
