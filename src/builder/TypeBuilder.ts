export class TypeBuilder<T extends {}> {
  constructor(private type: T) {}
  add<const TKey extends string, const TItem>(
    key: [TKey] extends [keyof T] ? never : TKey,
    item: TItem
  ) {
    const next = { ...this.type, [key]: item } as any as T & {
      [k in TKey & string]: TItem;
    };
    return new TypeBuilder(next);
  }
  addLayer<const TKey extends string, const Inner extends TypeBuilder<{}>>(
    key: TKey extends keyof T ? never : TKey,
    b: (b: TypeBuilder<{}>) => Inner
  ) {
    const next = {
      ...this.type,
      [key]: b(new TypeBuilder({})).build(),
    } as any as T & { [k in TKey & string]: ReturnType<Inner["build"]> };
    return new TypeBuilder(next);
  }
  build() {
    return this.type;
  }
}
