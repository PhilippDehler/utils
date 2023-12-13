export class Optional<T> {
  constructor(private value: T | null) {}
  map<C>(_: (val: T) => C): Optional<C> {
    if (this.value === null) return this as any as Optional<C>;
    return new Optional(_(this.value));
  }
  flatMap<C>(_: (val: T) => C | Optional<C>): Optional<C> {
    if (this.value === null) return this as any as Optional<C>;
    const result = _(this.value);
    return result instanceof Optional ? result : new Optional(result);
  }
  unwrap() {
    return this.value;
  }
  unwrapOr(or: T): T {
    return this.value ?? or;
  }
}
