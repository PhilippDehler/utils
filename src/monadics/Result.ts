/**
 * Converts an unknown input to an Error object.
 * If the input is already an Error, it is returned as is.
 * Otherwise, a new Error is created with the string representation of the input.
 * @param {unknown} error - The input to convert to an Error.
 * @returns {Error} The converted Error.
 */
function toError(error: unknown): Error {
  try {
    if (error instanceof Error) return error;
    return new Error(String(error));
  } catch (err) {
    return toError(err);
  }
}

/**
 * Represents an error state with a tag and an error object.
 * @typedef {Object} Err
 * @property {string} tag - The tag indicating an error state.
 * @property {E} error - The error object.
 */
type Err<E> = {
  tag: "err";
  error: E;
};

/**
 * Represents a successful state with a tag and a data object.
 * @typedef {Object} Ok
 * @property {string} tag - The tag indicating a successful state.
 * @property {D} data - The data object.
 */
type Ok<D> = {
  tag: "ok";
  data: D;
};

/**
 * Represents a successful state with a tag and a data object.
 * @typedef {Object} Ok
 * @property {string} tag - The tag indicating a successful state.
 * @property {D} data - The data object.
 */
function Ok<D>(data: D): Ok<D> {
  const self: Ok<D> = {
    tag: "ok",
    data,
  };
  return self;
}

/**
 * Represents a successful state with a tag and a data object.
 * @typedef {Object} Ok
 * @property {string} tag - The tag indicating a successful state.
 * @property {D} data - The data object.
 */
function Err<E>(error: E): Err<E> {
  const self: Err<E> = {
    tag: "err",
    error,
  };
  return self;
}

/**
 * Checks if an Either object is an Ok.
 * @param {Either<D, E>} either - The Either object to check.
 * @returns {boolean} True if the Either object is an Ok, false otherwise.
 */
function isOk<D, E>(either: Either<D, E>): either is Ok<D> {
  return either.tag === "ok";
}

/**
 * Checks if an Either object is an Err.
 * @param {Either<D, E>} either - The Either object to check.
 * @returns {boolean} True if the Either object is an Err, false otherwise.
 */
function isErr<D, E>(either: Either<D, E>): either is Err<E> {
  return either.tag === "err";
}

type Either<D, E> = Err<E> | Ok<D>;

/**
 * The Result class is a way to handle operations that might fail. It's a type-safe way of handling errors.
 * It's a generic class that takes two type parameters: OK and ERR.
 * OK is the type of the successful result, and ERR is the type of the error.

 * Represents a result of an operation that can be either successful (`Ok`) or contain an error (`Err`).
 *
 * @template OK - The type of the successful result.
 * @template ERR - The type of the error result.
 */
export class Result<OK = unknown, ERR = unknown> {
  /**
   * The constructor takes an Either type, which can be either Ok or Err.
   * @param {Either<OK, ERR>} internal - The result of the operation.
   */
  constructor(private internal: Either<OK, ERR>) {}

  /**
   * Checks if the result is Ok.
   * @returns {boolean} - Returns true if the result is Ok, false otherwise.
   */
  isOk(this: Result<OK, ERR>): this is { internal: Ok<OK> } {
    return isOk(this.internal);
  }

  /**
   * Checks if the result is Err.
   * @returns {boolean} - Returns true if the result is Err, false otherwise.
   */
  isErr(this: Result<OK, ERR>): this is { internal: Err<ERR> } {
    return isErr(this.internal);
  }

  /**
   * Creates a new Ok result.
   * @param {D} data - The successful result.
   * @returns {Result<D, E>} - Returns a new Ok result.
   */
  static Ok<D, E = never>(data: D) {
    return new Result<D, E>(Ok(data));
  }

  /**
   * Creates a new Err result.
   * @param {E} error - The error.
   * @returns {Result<D, E>} - Returns a new Err result.
   */
  static Err<D, E>(error: E) {
    return new Result<D, E>(Err(error));
  }

  /**
   * Lifts a function into a new function that returns a `Result` type.
   * The lifted function handles any potential errors thrown by the original function.
   *
   * @param fn - The function to be lifted.
   * @returns A new function that returns a `Result` type.
   */
  static lift<Fn extends (...args: any[]) => any>(
    fn: Fn
  ): (...args: Parameters<Fn>) => Result<ReturnType<Fn>, Error> {
    return (...args: Parameters<Fn>) => {
      try {
        return this.Ok(fn(args));
      } catch (e) {
        return this.Err(toError(e));
      }
    };
  }

  /**
   * Lifts an asynchronous operation into a `Result` type.
   *
   * @template P - The type of the promise.
   * @param promise - The promise to lift.
   * @returns A promise that resolves to a `Result` containing the result of the original promise or an error.
   */
  static async liftAsync<P extends Promise<any>>(
    promise: P
  ): Promise<Result<Awaited<P>, Error>> {
    return promise.then((d) => this.Ok(d)).catch((e) => this.Err(toError(e)));
  }

  /**
   * Maps the value of a `Result` using the provided mapping function.
   *
   * @param fn - The mapping function to apply to the value.
   * @returns A new `Result` with the mapped value.
   */
  static map<Data, NewData>(fn: (data: Data) => NewData) {
    return <D extends Data, E extends Error>(result: Result<D, E>) =>
      result.map<NewData>(fn);
  }

  /**
   * Maps the value of a `Result` asynchronously using a provided function.
   *
   * @typeparam Data The type of the original value in the `Result`.
   * @typeparam NewData The type of the new value after mapping.
   * @param fn The function used to map the value.
   * @returns A new `Result` with the mapped value.
   */
  static mapAsync<Data, NewData>(
    fn: (data: Data) => Promise<NewData>
  ): (result: Result<Data, Error>) => Promise<Result<NewData, Error>> {
    return async (result: Result<Data, Error>) => result.mapAsync<NewData>(fn);
  }

  /**
   * Maps the error value of a `Result` using the provided function.
   *
   * @typeparam Error The type of the original error value.
   * @typeparam NewError The type of the mapped error value.
   * @param fn The function to map the error value.
   * @returns A new function that takes a `Result` and maps its error value using the provided function.
   */
  static mapErr<Error, NewError extends Error>(fn: (e: Error) => NewError) {
    return <D, E extends Error>(result: Result<D, E>) =>
      result.mapErr<NewError>(fn);
  }

  /**
   * Applies a function to the data contained in the result, producing a new result.
   *
   * @typeparam Data The type of the data contained in the original result.
   * @typeparam NewData The type of the data contained in the new result.
   * @typeparam Error The type of the error contained in the original result.
   * @typeparam NewError The type of the error contained in the new result.
   * @param fn The function to apply to the data.
   * @returns A new result with the transformed data.
   */
  static fmap<Data, NewData, Error, NewError extends Error>(
    fn: (data: Data) => Result<NewData, NewError>
  ) {
    return <D extends Data, E extends Error>(result: Result<D, E>) =>
      result.fmap<NewData, NewError>(fn);
  }

  /**
   * Applies a function to the value contained in a `Result` object asynchronously,
   * producing a new `Result` object with a potentially different value type.
   *
   * @typeparam Data The type of the value contained in the input `Result` object.
   * @typeparam NewData The type of the value contained in the output `Result` object.
   * @typeparam Error The type of the error contained in the input `Result` object.
   * @typeparam NewError The type of the error contained in the output `Result` object.
   *
   * @param fn A function that takes the value contained in the input `Result` object
   * and returns a `Promise` that resolves to a new `Result` object with a potentially
   * different value type.
   *
   * @returns A function that takes a `Result` object and applies the provided function
   * to its value asynchronously, producing a new `Result` object with a potentially
   * different value type.
   */
  static fmapAsync<Data, NewData, Error, NewError extends Error>(
    fn: (data: Data) => Promise<Result<NewData, NewError>>
  ) {
    return <D extends Data, E extends Error>(result: Result<D, E>) =>
      result.fmapAsync<NewData, NewError>(fn);
  }

  /**
   * Applies the provided callbacks to the result based on its state.
   * If the result is Ok, the `ok` callback is called with the data.
   * If the result is Err, the `err` callback is called with the error.
   *
   * @param m - An object containing the `ok` and `err` callbacks.
   * @returns A new function that takes a `Result` and applies the provided callbacks to it.
   */
  static tap<Data, Error>(m: {
    ok: (d: Data) => void;
    err: (e: Error) => void;
  }) {
    return <D extends Data, E extends Error>(result: Result<D, E>) =>
      result.tap(m);
  }

  /**
   * Calls the provided callback function with the internal data or error.
   * If the internal result is an error, the `err` callback is called with the error.
   * If the internal result is a success, the `ok` callback is called with the data.
   *
   * @param m - An object containing the `ok` and `err` callbacks.
   * @returns The current instance of the `Result` class.
   */
  tap(m: { ok: (d: OK) => void; err: (e: ERR) => void }): this {
    if (isErr(this.internal)) m.err(this.internal.error);
    else m.ok(this.internal.data);
    return this;
  }

  /**
   * Transforms the data of the `Result` using the provided mapping function.
   * If the `Result` is an `Err`, it returns a new `Result` with the same error.
   * If the `Result` is an `Ok`, it applies the mapping function to the data and returns a new `Result` with the transformed data.
   *
   * @typeparam NewData The type of the transformed data.
   * @param fn The mapping function to apply to the data.
   * @returns A new `Result` with the transformed data or the same error.
   */
  map<NewData>(fn: (data: OK) => NewData) {
    if (isErr(this.internal))
      return Result.Err<ReturnType<typeof fn>, ERR>(this.internal.error);
    return Result.Ok<ReturnType<typeof fn>, ERR>(fn(this.internal.data));
  }

  /**
   * Asynchronously maps the data of the `Result` using the provided function.
   * If the `Result` is an `Err`, it returns a new `Result` with the same error.
   * If the `Result` is an `Ok`, it applies the provided function to the data and returns a new `Result` with the transformed data.
   *
   * @param fn - The function to apply to the data of the `Result`.
   * @returns A `Promise` that resolves to a new `Result` with the transformed data or the same error.
   */
  async mapAsync<NewData>(
    fn: (data: OK) => Promise<NewData>
  ): Promise<Result<NewData, ERR>> {
    if (isErr(this.internal))
      return Result.Err<Awaited<ReturnType<typeof fn>>, ERR>(
        this.internal.error
      );
    return fn(this.internal.data).then((d) => Result.Ok(d));
  }

  /**
   * Applies a function to the data contained in the `Result` instance asynchronously,
   * producing a new `Result` instance with the transformed data.
   *
   * @typeparam NewData The type of the transformed data.
   * @typeparam NewError The type of the potential error in the transformed `Result` instance.
   * @param fn The function to apply to the data.
   * @returns A `Promise` that resolves to a new `Result` instance with the transformed data,
   *          or an error if the original `Result` instance is an error.
   */
  async fmapAsync<NewData, NewError = ERR>(
    fn: (data: OK) => Promise<Result<NewData, NewError>>
  ): Promise<Result<NewData, NewError | ERR>> {
    if (isErr(this.internal))
      return Result.Err<NewData, NewError | ERR>(this.internal.error);
    return fn(this.internal.data);
  }

  /**
   * Transforms the error value of the `Result` using the provided function.
   * If the `Result` is an `Err`, the function will be applied to the error value and a new `Err` will be returned.
   * If the `Result` is an `Ok`, the original `Ok` value will be returned.
   *
   * @typeparam NewError - The type of the transformed error value.
   * @param fn - The function to transform the error value.
   * @returns A new `Result` with the transformed error value or the original `Ok` value.
   */
  mapErr<NewError>(fn: (e: ERR) => NewError) {
    if (isErr(this.internal))
      return Result.Err<OK, ReturnType<typeof fn>>(fn(this.internal.error));
    return Result.Ok<OK, ReturnType<typeof fn>>(this.internal.data);
  }

  /**
   * Applies a function to the data contained in the `Result` and returns a new `Result` with the transformed data.
   *
   * @typeparam NewData The type of the transformed data.
   * @typeparam NewError The type of the error in the transformed `Result`.
   * @param fn The function to apply to the data.
   * @returns A new `Result` with the transformed data.
   */
  fmap<NewData, NewError = ERR>(
    fn: (data: OK) => Result<NewData, NewError>
  ): Result<NewData, NewError | ERR> {
    if (isErr(this.internal))
      return Result.Err<NewData, NewError | ERR>(this.internal.error);
    return fn(this.internal.data);
  }

  /**
   * Unwraps the result, returning the data if it is Ok, or throwing an error if it is Err.
   * If the error is not an instance of Error, it will be wrapped in a new Error object.
   *
   * @returns The data if the result is Ok.
   * @throws An error if the result is Err.
   */
  unwrap(): OK {
    if (isErr(this.internal))
      throw this.internal.error instanceof Error
        ? this.internal.error
        : new Error(String(this.internal.error));
    return this.internal.data;
  }

  /**
   * Returns the wrapped value if the result is `OK`, otherwise returns the provided default value.
   *
   * @param defaultValue The default value to return if the result is an `Err`.
   * @returns The wrapped value if the result is `OK`, otherwise the provided default value.
   */
  unwrapOr(defaultValue: OK): OK {
    if (isErr(this.internal)) return defaultValue;
    return this.internal.data;
  }

  /**
   * Matches the result and executes the corresponding callback based on whether the result is an OK or an ERR.
   * @param m - An object containing the callback functions for OK and ERR cases.
   * @returns The result of executing the callback function based on the result type.
   */
  match<DataResult, ErrorResult = DataResult>(m: {
    ok: (d: OK) => DataResult;
    err: (e: ERR) => ErrorResult;
  }) {
    if (isErr(this.internal)) return m.err(this.internal.error);
    return m.ok(this.internal.data);
  }
}
