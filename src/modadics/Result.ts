import { toError } from "../toError";

type Either<D, E> =
  | {
      data: D;
    }
  | {
      error: E;
    };

export class Result<Data = unknown, Err = unknown> {
  constructor(private internal: Either<Data, Err>) {}

  #hasErr(internal: Either<Data, Err>): internal is { error: Err } {
    return "error" in internal;
  }

  static Ok<D>(data: D) {
    return new Result<D, never>({ data });
  }

  static Err<E>(error: E) {
    return new Result<never, E>({ error });
  }

  static stringify(e: unknown): Result<string, Error> {
    try {
      return this.Ok(JSON.stringify(e));
    } catch (e) {
      if (e instanceof Error) return this.Err(e);
      return this.Err(new Error("Internal Result error"));
    }
  }

  static wrapFn<F extends (...args: any[]) => any>(
    fn: F
  ): (...args: Parameters<F>) => Result<ReturnType<F>, Error> {
    return (...args: Parameters<F>) => {
      try {
        return this.Ok(fn(args));
      } catch (e) {
        return this.Err(toError(e));
      }
    };
  }

  static wrapPromise<T extends Promise<unknown>>(
    p: T
  ): Promise<Result<Awaited<T>, Error>> {
    return p
      .then((t) => this.Ok<Awaited<T>>(t as any))
      .catch((e) => this.Err(toError(e)));
  }

  map<NewData>(fn: (data: Data) => NewData) {
    if (this.#hasErr(this.internal))
      return new Result<NewData, Err>({ error: this.internal.error });
    return new Result<NewData, Err>({ data: fn(this.internal.data) });
  }

  flatMap<NewData, NewError = Err>(
    fn: (data: Data) => Result<NewData, NewError> | NewData
  ): Result<NewData, NewError | Err> {
    if (this.#hasErr(this.internal))
      return new Result<NewData, Err | NewError>({
        error: this.internal.error,
      });
    const res = fn(this.internal.data);
    return res instanceof Result ? res : new Result({ data: res });
  }

  unwrap(): Data {
    if (this.#hasErr(this.internal))
      throw this.internal.error instanceof Error
        ? this.internal.error
        : new Error(JSON.stringify(this.internal.error));
    return this.internal.data;
  }

  unwrapOr(defaultValue: Data): Data {
    if (this.#hasErr(this.internal)) return defaultValue;
    return this.internal.data;
  }

  match<DataResult, ErrorResult = DataResult>(m: {
    data: (d: Data) => DataResult;
    err: (e: Err) => ErrorResult;
  }) {
    if (this.#hasErr(this.internal)) return m.err(this.internal.error);
    return m.data(this.internal.data);
  }
}

function test(): Result<string, string> {
  return Math.random() < 0.5 ? Result.Ok("") : Result.Err("new Error()");
}

function couldthrow(): Result<number, Error> {
  if (Math.random() < 0.5) return Result.Err(new Error("hello"));
  return Result.Ok(1);
}
console.log(
  couldthrow()
    .map((r) => r * 2)
    .unwrapOr(10)
);
// ^?
