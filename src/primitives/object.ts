type Obj = Record<PropertyKey, unknown>;

export function entries<T extends Obj>(
  obj: T
): { [K in keyof T]: [K, T[K]] }[keyof T][] {
  return Object.entries(obj) as any;
}

export function values<T extends Obj>(obj: T): T[keyof T][] {
  return Object.values(obj) as any;
}

export function keys<T extends Obj>(obj: T): (keyof T)[] {
  return Object.keys(obj);
}

type ObjectAssign<Target extends Obj, Sources extends Obj[]> = Sources extends [
  infer HSource extends Obj,
  ...infer TSources extends Obj[]
]
  ? ObjectAssign<Assign<Target, HSource>, TSources>
  : Target;

type Assign<Target, Source> = {
  [Key in keyof Target | keyof Source]: Key extends keyof Source
    ? Source[Key]
    : Key extends keyof Target
    ? Target[Key]
    : never;
};

export function assign<Target extends Obj, Sources extends Obj[]>(
  target: Target,
  ...sources: Sources
): ObjectAssign<Target, Sources> {
  return Object.assign(target, ...sources);
}

export function isKeyOf<const Key extends PropertyKey>(
  obj: unknown,
  key: Key
): obj is { [K in Key]: unknown } {
  return !!obj && typeof obj === "object" && key in obj;
}

type ConstructPath<Keys extends PropertyKey[]> = Keys extends [
  infer H extends PropertyKey,
  ...infer T extends PropertyKey[]
]
  ? { [K in H]: ConstructPath<T> }
  : unknown;

export function hasPath<Keys extends PropertyKey[]>(
  obj: unknown,
  ...keys: Keys
): obj is ConstructPath<Keys> {
  const [head, ...tail] = keys;
  if (!head) return true;
  if (isKeyOf(obj, head)) return hasPath(obj, ...tail);
  return false;
}
