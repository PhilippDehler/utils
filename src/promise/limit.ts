export function limit<TArgs extends any[], TReturnType>(
  maxConcurrency: number,
  func: (...args: TArgs) => Promise<TReturnType>
): (...args: TArgs) => Promise<TReturnType> {
  let queue: (() => Promise<void>)[] = [];
  let runningRequests = 0;
  const next = () => queue.shift()?.() ?? null;
  return (...args: TArgs) =>
    new Promise<TReturnType>((resolve, reject) => {
      const queueItem = () => {
        runningRequests++;
        return func(...args)
          .then(resolve, reject)
          .finally(() => {
            runningRequests--;
            next();
          });
      };
      if (runningRequests === maxConcurrency) return queue.push(queueItem);
      queueItem();
    });
}
