function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

type Replace<K extends keyof O, O, R> = {
  [Key in keyof O]: Key extends K ? R : O[Key];
};

type Builder<T, V> = {
  builts: T;
  versions: V;
  add: <K extends string, const Item>(
    key: Exclude<K, keyof T>,
    item: Item
  ) => Builder<T & { [Key in K]: Item }, V>;
  change: <K extends keyof T, const Item>(
    key: K,
    item: (input: T[K]) => Item
  ) => Builder<Replace<K, T, Item>, V>;
  buildVersion: <K extends string>(
    version: Exclude<K, keyof V>
  ) => Builder<T, V & { [Key in K]: T }>;
};

function builder<T extends {}, V extends {}>(builts: T, versions: V) {
  const self: Builder<T, V> = {
    builts,
    versions,
    add: (key, item) => {
      return builder({ ...self.builts, [key]: item } as any, self.versions);
    },
    change: (key, item) => {
      const newBuilts = Object.fromEntries(
        Object.entries(self.builts).map(([objKey, value]) => {
          if (objKey === key) return [key, item];
          return [key, value];
        })
      ) as any;
      return builder(newBuilts, self.versions);
    },
    buildVersion: (version) => {
      return builder(self.builts, {
        ...self.versions,
        [version]: deepCopy(self.builts),
      } as any);
    },
  };
  return self;
}

function deepFlat<T>(
  arg: T,
  currentPath: string = "",
  flat: DeepFlat<T> = {} as DeepFlat<T>
): DeepFlat<T> {
  const _: any = flat;
  _[currentPath] = arg;
  if (arg === null) return flat;
  if (typeof arg === "object")
    Object.keys(arg).forEach((key: any) =>
      (deepFlat as any)(
        (arg as any)[key],
        [currentPath, key].filter(Boolean).join("."),
        _
      )
    );
  return _;
}

const x = deepFlat({ a: { b: { c: 1 as const } } });
const y = x["a.b.c"];

type Entry = [string, unknown];

type $deepFlat<
  Arg,
  Path extends string = "",
  $agg extends Entry[] = [],
  $next extends Entry[] = [...$agg, [Path, Arg]]
> = Arg extends object
  ? Arg extends any[]
    ? IsTuple<Arg> extends false
      ? DeepFlatArray<Arg, Path, $next>
      : DeepFlatTuple<Arg, Path, $next>
    : DeepFlatObject<Arg, Path, $next>
  : $next;

type DeepFlat<T> = $deepFlat<T> extends infer A extends Entry[]
  ? FromEntries<A[number]>
  : never;

type DeepFlatTuple<
  Arg extends any[],
  BasePath extends string = "",
  $agg extends Entry[] = [],
  $count extends Num = []
> = Arg extends [infer H, ...infer Tail]
  ? $deepFlat<
      H,
      Concat<BasePath, $count["length"]>
    > extends infer A extends Entry[]
    ? DeepFlatTuple<Tail, BasePath, [...$agg, ...A], $inc<$count>>
    : never
  : $agg;

type DeepFlatArray<
  Arg extends any[],
  BasePath extends string = "",
  $agg extends Entry[] = []
> = Arg extends (infer Item)[]
  ? $deepFlat<Item, Concat<BasePath, number>, $agg>
  : [];
type DeepFlatObject<
  Arg extends object,
  BasePath extends string = "",
  $agg extends Entry[] = []
> = [
  ...$agg,
  ...{
    [K in keyof Arg]: $deepFlat<Arg[K], Concat<BasePath, CastKey<K>>>;
  }[keyof Arg]
];

type Concat<A extends string, B extends string | number> = A extends ""
  ? `${B}`
  : `${A}.${B}`;
type CastKey<T> = T & (string | number);
type FromEntries<T extends Entry> = {
  [K in T[0]]: Extract<T, [K, unknown]>[1];
};

type Num = 0[];
type $inc<T extends Num> = [...T, 0];

type IsTuple<T extends any[]> = T["length"] extends number
  ? number extends T["length"]
    ? false
    : true
  : false;
