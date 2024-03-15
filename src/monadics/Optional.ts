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

  /**
   * Applies a mapping function to the value of the Optional.
   * @template C - The type of the mapped value.
   * @param _ - The mapping function.
   * @returns A new Optional instance with the mapped value.
   */
  map<C>(_: (val: T) => C): Optional<C> {
    if (isNil(this.value)) return this as any as Optional<C>;
    return new Optional(_(this.value));
  }

  /**
   * Applies a mapping function to the value of the Optional and flattens the result.
   * @template C - The type of the mapped value.
   * @param _ - The mapping function.
   * @returns A new Optional instance with the flattened mapped value.
   */
  flatMap<C>(_: (val: T) => C | Optional<C>): Optional<C> {
    if (isNil(this.value)) return this as any as Optional<C>;
    const result = _(this.value);
    return result instanceof Optional ? result : new Optional(result);
  }

  /**
   * Creates an Optional instance from a value.
   * @template T - The type of the value.
   * @param val - The value to wrap in the Optional.
   * @returns A new Optional instance.
   */
  static from<T>(val: T | null | undefined): Optional<T> {
    return new Optional(val);
  }

  /**
   * Lifts a function to operate on Optional values.
   * @template T - The type of the input value.
   * @template C - The type of the output value.
   * @param fn - The function to lift.
   * @returns A lifted function that operates on Optional values.
   */
  static lift<T, C>(fn: (val: T) => C) {
    return (val: Optional<T>) => val.map(fn);
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
  unwrapOr(or: T): T {
    return this.value ?? or;
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
}

export const None = <T>() => new Optional<T>(null);
export const Some = <T>(val: T) => new Optional(val);
