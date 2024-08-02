import { isNil } from "../guards/isNil";
import { Maybe } from "../ts-utils";

/**
 * Represents an optional value that may or may not be present.
 * @template T - The type of the value.
 */
export class Optional<T> {
  /**
   * Creates a new Optional instance.
   * @param value - The value to wrap in the Optional.
   */
  constructor(private value: Maybe<T>) {}
  #cast<A, B>(o: Optional<A>): Optional<B> {
    return o as any as Optional<B>;
  }
  /**
   * Maps the value of the Optional if it is `null` or `undefined`.
   *
   * @template C - The identity function to none.
   * @param {C} value - The new value to map to.
   * @returns {Optional<C>} - The new Optional with the mapped value.
   */
  mapNone<C>(_: () => Maybe<C>): Optional<C> {
    if (isNil(this.value)) return new Optional<C>(_());
    return this.#cast(this);
  }

  /**
   * Applies a function to the value of the `Optional` if it is `null` or `undefined`.
   * If the value is not `null` or `undefined`, the `Optional` is returned unchanged.
   *
   * @param _ A function that returns a `Maybe` or `Optional` value.
   * @returns An `Optional` value that is the result of applying the function to the value of the `Optional` if it is `null` or `undefined`.
   */
  fmapNone<C>(_: () => Maybe<C> | Optional<C>): Optional<C> {
    if (isNil(this.value)) {
      const result = _();
      if (result instanceof Optional) return result;
      return new Optional<C>(result);
    }
    return this.#cast(this);
  }

  /**
   * Applies a mapping function to the value of the Optional.
   * @template C - The type of the mapped value.
   * @param _ - The mapping function.
   * @returns A new Optional instance with the mapped value.
   */
  map<C>(_: (val: T) => Maybe<C>): Optional<C> {
    if (isNil(this.value)) return this.#cast(this);
    return new Optional(_(this.value));
  }

  tap(fn: (val: T) => void) {
    if (isNil(this.value)) return this;
    fn(this.value);
    return this;
  }

  /**
   * Applies a mapping function to the value of the Optional and flattens the result.
   * @template C - The type of the mapped value.
   * @param _ - The mapping function.
   * @returns A new Optional instance with the flattened mapped value.
   */
  fmap<C>(_: (val: T) => Maybe<C> | Optional<C>): Optional<C> {
    if (isNil(this.value)) return this.#cast(this);
    const result = _(this.value);
    return result instanceof Optional ? result : new Optional(result);
  }

  /**
   * Unwraps the value of the Optional.
   * @returns The wrapped value.
   */
  unwrap() {
    return this.value;
  }

  /**
   * Unwraps the value of the Optional, or returns a default value if the Optional is empty.
   * @param or - The default value to return.
   * @returns The wrapped value or the default value.
   */
  unwrapOr<U>(or: U): T | U {
    return this.value ?? or;
  }

  unwrapOrGet<U>(or: () => U): T | U {
    return this.value ?? or();
  }

  /**
   * Checks if the Optional is empty.
   * @returns True if the Optional is empty, false otherwise.
   */
  isNone(): this is Optional<null> {
    return isNil(this.value);
  }

  /**
   * Checks if the Optional is not empty.
   * @returns True if the Optional is not empty, false otherwise.
   */
  isSome(): this is Optional<T> {
    return !isNil(this.value);
  }

  /**
   * Matches the value of the Optional and executes the corresponding callback.
   * @template C - The type of the result.
   * @param _ - An object containing the callback functions for the "some" and "none" cases.
   * @returns The result of executing the callback.
   */
  match<C>(_: { some: (val: T) => C; none: () => C }): C {
    return isNil(this.value) ? _.none() : _.some(this.value);
  }

  /**
   * Returns a new Optional instance with a narrowed type based on the provided predicate function.
   * If the value is null or undefined, it returns None.
   * If the predicate function returns true for the value, it returns a new Optional instance with the same value.
   * Otherwise, it returns None.
   *
   * @param predicate - The predicate function that narrows down the type of the value.
   * @returns A new Optional instance with a narrowed type based on the guard function.
   */
  filter<U extends T>(predicate: (val: T) => val is U): Optional<U>;
  filter(predicate: (val: T) => unknown): Optional<T> {
    if (isNil(this.value)) return this;
    return predicate(this.value) ? new Optional(this.value) : None<T>();
  }

  /**
   * Unwraps the value of the optional or throws an error with the specified message if the value is null or undefined.
   *
   * @param message - The error message to throw if the value is null or undefined.
   * @returns The unwrapped value.
   * @throws {Error} If the value is null or undefined.
   */
  unwrapOrThrow(message: string) {
    if (isNil(this.value)) throw new Error(message);
    return this.value;
  }

  /**
   * Applies a consumer function to the value if it satisfies the provided predicate function.
   * If the value satisfies the predicate, the consumer function is called with the value.
   * If the value does not satisfy the predicate, the consumer function is not called.
   * Returns a new Optional instance with the same value if the value does not satisfy the predicate,
   * otherwise returns an Optional instance with no value.
   *
   * @template U - The type that the value should be checked against.
   * @param {function(val: T): val is U} fn - The predicate function to check if the value satisfies.
   * @param {(val: U) => void} consumer - The consumer function to be called if the value satisfies the predicate.
   * @returns {Optional<T>} - A new Optional instance with the same value if the value does not satisfy the predicate,
   *                          otherwise returns an Optional instance with no value.
   */
  consume<U extends T>(
    fn: Guard<T, U>,
    consumer: (val: U) => void
  ): Optional<T>;
  consume(fn: (val: T) => boolean, consumer: (val: T) => void): Optional<T> {
    if (isNil(this.value)) return this;
    if (fn(this.value)) {
      consumer(this.value);
      return None<T>();
    }
    return this;
  }
}

export const None = <T>() => new Optional<T>(null);
export const Some = <T>(val: T) => new Optional(val);

type Guard<A, B extends A> = (value: A) => value is B;

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

/**
 * Creates an Optional instance from a value.
 * @template T - The type of the value.
 * @param val - The value to wrap in the Optional.
 * @returns A new Optional instance.
 */
export function fromMaybe<T>(val: Maybe<T>): Optional<T> {
  return new Optional(val);
}
