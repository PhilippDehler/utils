import { sleep } from "./sleep";

type RetryOptions = {
  retries: number;
  initalDelay: number;
  nextDelay?: (currentDelay: number) => number;
};

export function retry<Fn extends (...args: any[]) => Promise<unknown>>(
  fn: Fn,
  opts: RetryOptions
) {
  return async (...args: Parameters<Fn>): Promise<Awaited<ReturnType<Fn>>> => {
    try {
      return (await fn(...args)) as Awaited<ReturnType<Fn>>;
    } catch (err) {
      if (opts.retries <= 0) throw err;
      await sleep(opts.initalDelay);
      return await retry(fn, {
        retries: opts.retries - 1,
        initalDelay: opts.nextDelay?.(opts.initalDelay) ?? opts.initalDelay,
        nextDelay: opts.nextDelay,
      })(...args);
    }
  };
}
