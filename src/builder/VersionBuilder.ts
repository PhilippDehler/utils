function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

type Replace<K extends keyof O, O, R> = {
  [Key in keyof O]: Key extends K ? R : O[Key];
};

type Builder<T, V> = {
  builts: T;
  versions: V;
  add: <K extends string, const Item>(
    key: Exclude<K, keyof T>,
    item: Item
  ) => Builder<T & { [Key in K]: Item }, V>;
  change: <K extends keyof T, const Item>(
    key: K,
    item: (input: T[K]) => Item
  ) => Builder<Replace<K, T, Item>, V>;
  buildVersion: <K extends string>(
    version: Exclude<K, keyof V>
  ) => Builder<T, V & { [Key in K]: T }>;
};

function builder<T extends {}, V extends {}>(builts: T, versions: V) {
  const self: Builder<T, V> = {
    builts,
    versions,
    add: (key, item) => {
      return builder({ ...self.builts, [key]: item } as any, self.versions);
    },
    change: (key, item) => {
      const newBuilts = Object.fromEntries(
        Object.entries(self.builts).map(([objKey, value]) => {
          if (objKey === key) return [key, item];
          return [key, value];
        })
      ) as any;
      return builder(newBuilts, self.versions);
    },
    buildVersion: (version) => {
      return builder(self.builts, {
        ...self.versions,
        [version]: deepCopy(self.builts),
      } as any);
    },
  };
  return self;
}
