export function compose<
  A extends (...args: unknown[]) => any,
  B extends (arg: ReturnType<A>) => unknown
>(a: A, b: B) {
  return (...args: Parameters<A>) => b(a(...args));
}
