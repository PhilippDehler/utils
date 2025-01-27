import { Args, Fn, Return } from "./type";

export function compose<
  A extends Fn,
  B extends (arg: ReturnType<A>) => unknown
>(a: A, b: B) {
  return (...args: Parameters<A>) => b(a(...args));
}

export type Compose<A extends Fn, B extends Fn<Return<B>>> = Fn<
  Args<A>,
  Return<B>
>;
