import { compose } from "./compose";
import { create } from "./create";
import { exclude } from "./exclude";
import { override } from "./override";
import { required, RequiredThis, RequiredTrait } from "./required";
import { resolve } from "./resolve";
import { trait, type Trait as TraitType } from "./trait";

export const Trait = {
  compose,
  create,
  exclude,
  override,
  required,
  resolve,
  trait,
};

type ValuesTrait<T> = TraitType<{
  values: RequiredTrait<Iterable<T>>;
}>;
// real world example
const ValuesTrait = <T>() =>
  trait({
    values: required<Iterable<T>>(),
  });

const x = Trait.create({ values: [1, 2, 3] }, ValuesTrait<number>());

const SetTrait = <T>(values: T[]) => {
  return Trait.create(
    { values: values },
    Trait.trait({
      values: required<Iterable<T>>(),
      fmap<U>(this: { values: Iterable<T> }, callback: (value: T) => U): Iterable<U> {
        let mapped: U[] = [];
        for (const val of this.values) mapped.push(callback(val));
        return mapped;
      },
      has(value: unknown) {
        for (const val of this.values) if (val === value) return true;
        return false;
      },
      size() {
        let count = 0;
        for (const _ of this.values) count++;
        return count;
      },
      entries(): Iterable<[T, T]> {
        let ent: [T, T][] = [];
        for (const val of this.values) ent.push([val, val]);
        return ent;
      },
      forEach(callback: (value: T) => void) {
        for (const val of this.values) callback(val);
      },

      keys(): Iterable<T> {
        return this.values;
      },
    }),
  );
};

type F = RequiredThis<{
  values: RequiredTrait<Iterable<number>>;
  has(value: unknown): boolean;
  size(): number;
  entries(): Iterable<[number, number]>;
  forEach(callback: (value: number) => void): void;
  keys(): Iterable<never>;
}>;
const xs = SetTrait([1, 2, 3]);

new Set().difference;
new Set().intersection;
new Set().isSubsetOf;
new Set().isSupersetOf;
new Set().isDisjointFrom;
new Set().union;
new Set().symmetricDifference;
