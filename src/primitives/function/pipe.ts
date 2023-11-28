export type Pipe<T> = {
  value: T;
  map: <U>(transform: (v: T) => U) => Pipe<U>;
  exec: () => T;
};

export function pipe<T>(value: T): Pipe<T> {
  const self: Pipe<any> = {
    value,
    map(transform) {
      self.value = transform(self.value);
      return self;
    },
    exec() {
      return self.value;
    },
  };
  return self;
}
