export function CreateTupleBuilder<ItemInterface>() {
  return class TupleBuilder<T extends ItemInterface[]> {
    constructor(private initial: T) {}
    add<const TItem extends ItemInterface>(item: TItem) {
      const tup = [...this.initial, item] as any as T extends never[]
        ? [TItem]
        : [...T, TItem];
      return new TupleBuilder(tup);
    }
    build() {
      return this.initial;
    }
  };
}
