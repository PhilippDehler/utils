export function join<const Delimiter extends string, const T extends string[]>(
  delimiter: Delimiter,
  ...args: T
): Join<T, Delimiter> {
  return args.join(delimiter) as Join<T, Delimiter>;
}

export type Join<
  T extends string[],
  Delimiter extends string,
  $agg extends string = ""
> = T extends [infer Head extends string, ...infer Tail extends string[]]
  ? Join<Tail, Delimiter, `${$agg}${$agg extends "" ? "" : Delimiter}${Head}`>
  : $agg;
