import {
  ConflictPropertyDescriptor,
  DecorateMethodPropertyDescriptor,
  getOwnPropertyDescriptor,
  makeRequiredPropDesc,
  MethodPropertyDescriptor,
  PropertyDescriptorBase,
  RequiredPropertyDescriptor,
} from "./property-descriptors";
import { required, RequiredThis } from "./required";

// prettier-ignore
export type Trait<T> = { [K in keyof T]: PropertyDescriptorMapper<T[K]> };
type PropertyDescriptorMapper<T> = [T] extends [never]
  ? ConflictPropertyDescriptor
  : T extends (...args: any[]) => any
    ? MethodPropertyDescriptor<T>
    : T extends Required<any>
      ? RequiredPropertyDescriptor<T["_type"]>
      : PropertyDescriptorBase<T>;

export type InferTrait<T> = T extends Trait<infer U> ? U : never;

export type Magic<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (this: RequiredThis<T>, ...args: Parameters<T[K]>) => ReturnType<T[K]> // methods
    : T[K];
};

export function trait<$Trait>(obj: Magic<$Trait>): Trait<$Trait> {
  const map: Record<string, PropertyDescriptor> = {};
  Object.getOwnPropertyNames(obj).forEach((name) => {
    let pd = getOwnPropertyDescriptor(obj, name)!;
    if (pd.value === required()) {
      return (map[name] = makeRequiredPropDesc(name));
    }

    if (typeof pd.value === "function") {
      return (map[name] = DecorateMethodPropertyDescriptor(pd));
    }

    // Freeze getter & setter prototypes if present
    if (pd.get && pd.get.prototype) Object.freeze(pd.get.prototype);
    if (pd.set && pd.set.prototype) Object.freeze(pd.set.prototype);

    return (map[name] = pd);
  });
  return map as Trait<$Trait>;
}

// // Marks a property as required, carrying its actual type in _type
// type Req<T> = { _type: T };

// declare function required<T>(): Req<T>;

// // Unwraps Req<T> back to its underlying type
// export type FilterRequired<T> = {
//   [K in keyof T]: T[K] extends Req<any> ? T[K]["_type"] : T[K];
// };

// // Overwrites each fn's 'this' to be FilterRequired<T>
// type OverwriteThisOnMethods<T> = {
//   [K in keyof T]:
//       // Otherwise if it's a non-generic function, overwrite 'this' normally
//        T[K] extends (...args: infer A) => infer R
//       ? (this: FilterRequired<T>, ...args: A) => R
//       // If it's not a function, leave it alone
//       : T[K];
// };

// declare function fn<T>(input: OverwriteThisOnMethods<T>): void;

// // Example works: 'this.prop1' is correctly a number
// fn({
//   prop1: required<number>(),
//   map(cb: (item: number) => number) {
//     return cb(this.prop1);
//     //                ^?
//   },
// });

// // With a generic parameter, TS infers a slightly different 'this' type
// fn({
//   prop1: required<number>(),
//   map<A>(cb: (item: number) => A) {
//     this.prop1;
//     //    ^?
//     return cb(this.prop1);
//   },
// });

// // Calling the same method inside itself still keeps 'this' mostly correct
// fn({
//   prop1: required<number>(),
//   map<A>(cb: (item: number) => A) {
//     this.map;
//     //    ^?
//     this.map(null!); // Recognized as the same method, but 'this' type is tricky
//     // ^?

//     return cb(this.prop1);
//   },
// });
