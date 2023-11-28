export function CreateObjectBuilder<ItemInterface>() {
  return class ObjectBuilder<T extends { [x: string]: ItemInterface }> {
    constructor(private initial: T) {}
    add<Key extends string, const TItem extends ItemInterface>(
      key: Key,
      item: TItem
    ) {
      const tup: Omit<T, Key> & { [K in Key]: TItem } = {
        ...this.initial,
        [key]: item,
      };
      return new ObjectBuilder(tup);
    }
    build() {
      return this.initial;
    }
  };
}
