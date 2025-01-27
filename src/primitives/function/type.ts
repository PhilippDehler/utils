export type Fn<Args extends any[] = any[], Return = any> = (
  ...args: Args
) => Return;
export type Args<T extends Fn> = T extends Fn<infer A> ? A : never;
export type Return<T extends Fn> = T extends Fn<any, infer R> ? R : never;
export type UnknownFn = (...args: unknown[]) => unknown;
