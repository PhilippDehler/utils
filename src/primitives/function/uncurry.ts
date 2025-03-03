import { Fn } from "./type";

type AggArgs<TFn> = TFn extends Fn ? [...Parameters<TFn>, ...AggArgs<ReturnType<TFn>>] : [];
type GetRet<TFn> = TFn extends Fn ? (ReturnType<TFn> extends Fn ? GetRet<ReturnType<TFn>> : ReturnType<TFn>) : TFn;
type Uncurry<TFn> = (...args: AggArgs<TFn>) => GetRet<TFn>;

export function uncurry<T>(tFn: T): Uncurry<T> {
  let f = tFn;
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
