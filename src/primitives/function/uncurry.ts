import { AnyFn<Args,Return> } from "./type";

type AggArgs<Fn> = Fn extends AnyFn<Args,Return>
  ? [...Parameters<Fn>, ...AggArgs<ReturnType<Fn>>]
  : [];
type GetRet<Fn> = Fn extends AnyFn<Args,Return>
  ? ReturnType<Fn> extends AnyFn<Args,Return>
    ? GetRet<ReturnType<Fn>>
    : ReturnType<Fn>
  : Fn;
type Uncurry<Fn> = (...args: AggArgs<Fn>) => GetRet<Fn>;

function uncurry<T>(fn: T): Uncurry<T> {
  let f = fn;
  return (...args: any[]): any => {
    let _args: any[] = args;
    let currentArgs: any[] = [];
    while (typeof f === "function") {
      [currentArgs, _args] = splitAt(_args, f.length);
      f = f(...currentArgs);
    }
    return f;
  };
}

function splitAt<T>(items: T[], length: number): [any[], any[]] {
  return [items.slice(0, length), items.slice(length)];
}
