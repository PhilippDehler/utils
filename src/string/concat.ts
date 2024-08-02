export function concat<const T extends string[]>(...args: T): string {
  return args.join("") as Concat<T>;
}

export type Concat<T extends string[], $agg extends string = ""> = T extends [
  infer Head extends string,
  ...infer Tail extends string[]
]
  ? Concat<Tail, `${$agg}${Head}`>
  : `${$agg}`;
