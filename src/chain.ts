const linkTypes = ["map", "filter", "flatMap"] as const;

type ChainLinkType = (typeof linkTypes)[number];
type ChainLink = {
  [L in ChainLinkType]: {
    type: L;
    fn: (arg: Item<any>, index: number) => unknown;
  };
}[ChainLinkType];

type Item<TIterable> = TIterable extends Iterable<infer TItem>
  ? TItem
  : TIterable;

interface Chain<T extends Iterable<unknown>> {
  links: ChainLink[];
  map: <U>(cb: (v: Item<T>, index: number) => U) => Chain<Iterable<U>>;
  flatMap: <U extends unknown | Iterable<unknown>>(
    cb: (v: Item<T>, index: number) => U
  ) => Chain<Iterable<Item<U>>>;
  filter: (pred: (v: Item<T>, index: number) => boolean) => this;
  exec: () => T;
}

export function chain<T extends Iterable<unknown>>(value: T) {
  const self: Chain<T> = {
    links: [],
    map(callback) {
      self.links.push({ type: linkTypes[0], fn: callback });
      return self as any;
    },
    filter(predicate) {
      self.links.push({ type: linkTypes[1], fn: predicate });
      return self;
    },
    flatMap(callback) {
      self.links.push({ type: linkTypes[2], fn: callback });
      return self as any;
    },
    exec() {
      const items = [];
      let index = 0;
      for (const item of value) {
        let _item = [item];
        for (const link of this.links)
          _item = (_item[link.type] as any)((v: unknown, i: number) =>
            link.fn(v, index + i)
          );
        index += 1;
        items.push(..._item);
      }
      return items as any;
    },
  };
  return self;
}
