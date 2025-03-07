import { isKeyOf } from "../guards/isKeyof";

type Obj = Record<PropertyKey, unknown>;

export function entries<T extends Obj>(obj: T): { [K in keyof T]: [K, T[K]] }[keyof T][] {
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

type ConstructPath<Keys extends PropertyKey[]> = Keys extends [
  infer H extends PropertyKey,
  ...infer T extends PropertyKey[]
]
  ? { [K in H]: ConstructPath<T> }
  : unknown;

export function hasPath<Keys extends PropertyKey[]>(obj: unknown, ...keys: Keys): obj is ConstructPath<Keys> {
  const [head, ...tail] = keys;
  if (!head) return true;
  if (isKeyOf(obj, head)) return hasPath(obj, ...tail);
  return false;
}

export type OptionalKeys<T> = keyof {
  [K in keyof T as {} extends Pick<T, K> ? K : never]: T[K];
};

export type RequiredKeys<T> = Exclude<keyof T, OptionalKeys<T>>;

export function omit<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

export function omitMutate<T extends object, K extends keyof T | (string & {})>(obj: T, ...keys: K[]): void {
  for (const key of keys) {
    isKeyOf(obj, key) && delete obj[key];
  }
}

export function pick<T, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
  const clone = {} as Pick<T, K>;
  for (const key of keys) {
    clone[key] = obj[key];
  }
  return clone;
}
