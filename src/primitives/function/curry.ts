import { Fn } from "./type";

export type Curry<TFn extends Fn> = Parameters<TFn> extends [infer First, ...infer Rest]
  ? (arg: First) => Curry<(...rest: Rest) => ReturnType<TFn>>
  : ReturnType<TFn>;

export function curry<T extends Fn, TAgg extends unknown[]>(func: T, agg?: TAgg): Curry<T> {
  const aggregatedArgs = agg ?? [];
  if (func.length === aggregatedArgs.length) return func(...aggregatedArgs);
  return ((arg: any) => curry(func, [...aggregatedArgs, arg])) as any;
}
