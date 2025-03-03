export class Optional<T> {
  constructor() {}

  static is_none<T>(self: Optional<T>): self is None<T> {
    return self instanceof None;
  }
  static is_some<T>(self: Optional<T>): self is Some<T> {
    return self instanceof Some;
  }
  static is_optional(self: unknown): self is Optional<unknown> {
    return self instanceof Optional;
  }
  static map<T, C>(fn: (val: T) => C) {
    return (val: Optional<T>) => val.map(fn);
  }
  map<C>(_: (val: T) => C): Optional<C> {
    if (Optional.is_some(this)) return Some.new(_(this.value));
    return None.new();
  }

  static fmap<T, C>(fn: (val: T) => C | Optional<C>) {
    return (val: Optional<T>) => val.fmap(fn);
  }
  fmap<C>(_: (val: T) => C | Optional<C>): Optional<C> {
    if (Optional.is_some(this)) {
      const result = _(this.value);
      if (Optional.is_optional(result)) return result;
      return Some.new(result);
    }
    return None.new();
  }
  static tap<T>(fn: (val: T) => void) {
    return (val: Optional<T>) => val.tap(fn);
  }

  tap(fn: (val: T) => void): this {
    if (Optional.is_some(this)) fn(this.value);
    return this;
  }

  unwrap(): T | null {
    if (Optional.is_some(this)) return this.value;
    return null;
  }

  unwrap_or<U>(or: () => U): T | U {
    if (Optional.is_some(this)) return this.value;
    return or();
  }

  unwrap_or_throw(message: string): T {
    if (Optional.is_some(this)) return this.value;
    throw new Error(message);
  }

  match<C>(_: { some: (val: T) => C; none: () => C }): C {
    if (Optional.is_some(this)) return _.some(this.value);
    return _.none();
  }
  static match<T, C>(_: { some: (val: T) => C; none: () => C }) {
    return (val: Optional<T>) => val.match(_);
  }

  filter<U extends T>(predicate: (val: T) => val is U): Optional<U>;
  filter(predicate: (val: T) => unknown): Optional<T> {
    if (Optional.is_some(this) && predicate(this.value)) return this;
    return None.new();
  }
  static filter<T, U extends T>(predicate: (val: T) => val is U) {
    return (val: Optional<T>) => val.filter(predicate);
  }

  static lift<T, C>(fn: (val: T) => C) {
    return (val: Optional<T>) => val.map(fn);
  }
  static from_maybe<T>(val: T | null | undefined): Optional<T> {
    if (val === null || val === undefined) return None.new();
    return Some.new(val);
  }
}

export type Guard<A, B extends A> = (value: A) => value is B;

/**
 * Lifts a function to operate on Optional values.
 * @template T - The type of the input value.
 * @template C - The type of the output value.
 * @param fn - The function to lift.
 * @returns A lifted function that operates on Optional values.
 */
export function lift<T, C>(fn: (val: T) => C) {
  return (val: Optional<T>) => val.map(fn);
}

export class Some<T> extends Optional<T> {
  constructor(public value: T) {
    super();
  }
  static new<T>(value: T) {
    return new Some(value);
  }
  unwrap(): T {
    return this.value;
  }
  unwrap_or<U>(_: () => U): T {
    return this.value;
  }
  unwrap_or_throw(_: string): T {
    return this.value;
  }
}
export class None<T> extends Optional<T> {
  constructor() {
    super();
  }
  static new<T>() {
    return new None<T>();
  }
  unwrap(): null {
    return null;
  }
  unwrap_or<U>(or: () => U): U {
    return or();
  }
  unwrap_or_throw(message: string): never {
    throw new Error(message);
  }
}
