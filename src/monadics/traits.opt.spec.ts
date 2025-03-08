import { expect, it } from "vitest";
import { Equals } from "../ts-utils";

interface PropertyDescriptorBase<Type = any> extends PropertyDescriptor {
  value: Type;
  required?: boolean;
  conflict?: boolean;
  method?: boolean;
}
interface RequiredPropertyDescriptor<Type = any> extends PropertyDescriptor {
  value: Required<Type>;
  required: true;
  conflict?: false;
  method?: false;
}
function makeRequiredPropDesc<T>(name: string): RequiredPropertyDescriptor<T> {
  return Object.freeze({
    value: required<T>(),
    enumerable: false,
    required: true,
    type: "required",
    _type: null! as T,
  });
}

interface ConflictPropertyDescriptor<Type = any> extends PropertyDescriptor {
  value: Type;
  conflict: true;
  required?: false;
  method?: false;
}
function makeConflictingPropDesc(name: string): ConflictPropertyDescriptor<never> {
  const conflict = makeConflictAccessor(name);
  return Object.freeze({
    get: conflict,
    set: conflict,
    type: "conflict",
    enumerable: false,
    conflict: true,
    _type: null! as never,
  });
}

interface MethodPropertyDescriptor<Type = any> extends PropertyDescriptorBase<Type> {
  method?: true;
}

function makeConflictAccessor(name: string) {
  const accessor = function (...args: any[]): never {
    throw new Error("Conflicting property: " + name);
  };
  Object.freeze(accessor.prototype);
  return Object.freeze(accessor);
}

// Note: isSameDesc should return true if both
// desc1 and desc2 represent a 'required' property
// (otherwise two composed required properties would be turned into
// a conflict)
function isSameDesc(desc1: PropertyDescriptor, desc2: PropertyDescriptor): boolean {
  // for conflicting properties, don't compare values because
  // the conflicting property values are never equal
  if ("conflict" in desc1 && desc1.conflict && "conflict" in desc2 && desc2.conflict) {
    return true;
  } else {
    return (
      desc1.get === desc2.get &&
      desc1.set === desc2.set &&
      desc1.value === desc2.value &&
      desc1.enumerable === desc2.enumerable &&
      ("required" in desc1 && desc1.required) === ("required" in desc2 && desc2.required) &&
      ("conflict" in desc1 && desc1.conflict) === ("conflict" in desc2 && desc2.conflict)
    );
  }
}

type Required<T> = { key: "<REQUIRED_TRAIT>"; _type: T };
const __required = Object.freeze({ key: "<REQUIRED_TRAIT>" as const, _type: null! as never });
const required = <T>(): Required<T> => __required;

type Requires<T> = {
  [K in keyof T]: T[K] extends Required<any> ? T[K]["_type"] : T[K];
};

//prettier-ignore
type TypeToPropertyDescriptor<T> = 
  [T] extends [never] ? ConflictPropertyDescriptor<never>
  : T extends Required<any> ? RequiredPropertyDescriptor<T["_type"]>
  : T extends (...args: any[]) => any ? MethodPropertyDescriptor<T>
  : PropertyDescriptorBase<T>;

type Trait<T> = { [K in keyof T]: TypeToPropertyDescriptor<T[K]> };

type Magic<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? (this: Requires<T>, ...args: Parameters<T[K]>) => ReturnType<T[K]> // methods; TODO find a better way to type methods
    : T[K];
};
function trait<$Trait>(obj: Magic<$Trait>): Trait<$Trait> {
  const map: Record<string, PropertyDescriptor> = {};
  Object.getOwnPropertyNames(obj).forEach((name) => {
    let pd: any = Object.getOwnPropertyDescriptor(obj, name)!;
    if (pd.value === required()) {
      return (map[name] = makeRequiredPropDesc(name));
    }
    if (typeof pd.value === "function") {
      pd.type = "method";
      pd.method = true;
      pd.enumerable = false;
      if ("prototype" in pd.value) {
        Object.freeze(pd.value.prototype);
      }
      return (map[name] = pd);
    }
    // getter & setter
    if (pd.get && pd.get.prototype) Object.freeze(pd.get.prototype);
    if (pd.set && pd.set.prototype) Object.freeze(pd.set.prototype);
    return (map[name] = pd);
  });
  return map as Trait<$Trait>;
}
type AssertTrue<A extends true> = null;
it("trait", () => {
  const t = trait({ a: 1 });
  type TraitActual = typeof t;
  type TraitExpect = { a: PropertyDescriptorBase<number> };
  type _ = AssertTrue<Equals<TraitActual, TraitExpect>>;
  expect(t).toEqual({
    a: {
      configurable: true,
      enumerable: true,
      writable: true,
      value: 1,
    },
  });
});
it("trait required", () => {
  const t = trait({ a: required<number>() });
  type TraitActual = typeof t;
  type TraitExpect = { a: RequiredPropertyDescriptor<number> };
  type _ = AssertTrue<Equals<TraitActual, TraitExpect>>;
  expect(t).toEqual({
    a: {
      _type: null,
      enumerable: false,
      required: true,
      type: "required",
      value: required<number>(),
    },
  });
});
it("trait method", () => {
  const t = trait({
    bar: 0,
    getBar(): number {
      // needs type annotation
      return this.bar;
    },
  });
  type TraitActual = typeof t;
  type TraitExpect = { getBar: MethodPropertyDescriptor<() => number>; bar: PropertyDescriptorBase<number> };
  type _ = AssertTrue<Equals<TraitActual, TraitExpect>>;
  expect(t).toEqual({
    bar: {
      configurable: true,
      enumerable: true,
      writable: true,
      value: 0,
    },
    getBar: {
      configurable: true,
      enumerable: false,
      writable: true,
      value: t.getBar.value,
      method: true,
      type: "method",
    },
  });
});

it("trait get / set", () => {
  const t = trait({
    _bar: 0,
    get bar(): number {
      return this._bar;
    },
    set bar(value: number) {
      this._bar = value;
    },
  });

  type TraitActual = typeof t;
  type TraitExpect = { bar: PropertyDescriptorBase<number>; _bar: PropertyDescriptorBase<number> };
  type _ = AssertTrue<Equals<TraitActual, TraitExpect>>;
  expect(t).toEqual({
    bar: {
      configurable: true,
      enumerable: true,
      get: t.bar.get,
      set: t.bar.set,
    },
    _bar: {
      configurable: true,
      enumerable: true,
      value: 0,
      writable: true,
    },
  });
});

type concat<self, trait> =
  {
    //prettier-ignore
  [K in keyof self | keyof trait]: 
    K extends keyof self  ? 
       (self[K] extends Required<any> ? (K extends keyof trait ? trait[K] // overwrite required property
                                                               : self[K]) // keep required property
                                      :  K extends keyof trait ? trait[K] extends Required<any> ? self[K] 
                                                                                                : ConflictPropertyDescriptor 
                                                                : self[K]) // keep self property
    : K extends keyof trait ? trait[K] : never;

};

type T11 = concat<{ a: Required<1> }, { a: Required<2> }>; // take last required property
it("compose take last required", () => {
  type _ = AssertTrue<Equals<T11, { a: Required<2> }>>;
  expect({}).toEqual({});
});
type T12 = concat<{ a: Required<1> }, {}>; // keep required property
type T13 = concat<{ a: 1 }, { a: Required<2> }>; // ignore required property
type T14 = concat<{ a: Required<2> }, { a: 1 }>; // overwrite required property
type T15 = concat<{ a: 1 }, { a: 2 }>; // conflict
type T16 = concat<{}, { a: 2 }>; // take trait property

type Compose<$traits, $self = {}> = $traits extends [infer Tr, ...infer R]
  ? Compose<R, concat<$self, inferTrait<Tr>>>
  : Trait<$self>;

type T22 = Compose<[Trait<{}>, Trait<{}>]>; // { a:ConflictPropertyDescriptor<any> }
type T21 = Compose<[Trait<{ a: 1; b: Required<number> }>, Trait<{}>]>; // { a:ConflictPropertyDescriptor<any> }
type T20 = Compose<[Trait<{ a: 1; b: 2 }>, Trait<{ b: null }>]>; // { a: 1, b: 2 }
type T23 = Compose<[Trait<{ a: 1 }>, Trait<{}>]>; // { a: 1, b: 2 }

type T32 = concat<Trait<{ a: Required<1> }>, Trait<{}>>; // keep required property
type T33 = concat<Trait<{ a: 1 }>, Trait<{ a: Required<2> }>>; // ignore required property
type T34 = concat<Trait<{ a: Required<2> }>, Trait<{ a: 1 }>>; // overwrite required property
type T35 = concat<Trait<{ a: 1 }>, Trait<{ a: 2 }>>; // conflict
type T36 = concat<Trait<{}>, Trait<{ a: 2 }>>; // take trait property

function compose<$traits extends Trait<any>[]>(...traits: $traits): Compose<$traits> {
  const newTrait: any = {};
  traits.forEach((trait) => {
    Object.getOwnPropertyNames(trait).forEach((name) => {
      const pd = trait[name]!;
      if (newTrait.hasOwnProperty(name) && !newTrait[name]?.required) {
        // a non-required property with the same name was previously
        // defined this is not a conflict if pd represents a
        // 'required' property itself:
        if ("required" in pd && pd.required) {
          return; // skip this property, the required property is
          // now present
        }

        if (!isSameDesc(newTrait[name]!, pd)) {
          // a distinct, non-required property with the same name
          // was previously defined by another trait => mark as
          // conflicting property
          newTrait[name] = makeConflictingPropDesc(name);
        } // else,
        // properties are not in conflict if they refer to the same value
      } else {
        newTrait[name] = pd;
      }
    });
  });

  return Object.freeze(newTrait);
}

/* var newTrait = exclude(['name', ...], trait)
 *
 * @param names a list of strings denoting property names.
 * @param trait a trait some properties of which should be excluded.
 * @returns a new trait with the same own properties as the original trait,
 *          except that all property names appearing in the first argument
 *          are replaced by required property descriptors.
 *
 * Note: exclude(A, exclude(B,t)) is equivalent to exclude(A U B, t)
 */
type ExcludeFromTrait<Trait, Names extends keyof Trait> = {
  [K in keyof Trait]: K extends Names ? RequiredPropertyDescriptor<Trait[K]> : Trait[K];
};

function exclude<Trait extends Record<string, PropertyDescriptor>, const Names extends keyof Trait & string>(
  trait: Trait,
  ...names: Names[]
): ExcludeFromTrait<Trait, Names> {
  const exclusions: Set<string> = new Set(names);
  const newTrait: Record<string, PropertyDescriptor> = {};
  Object.getOwnPropertyNames(trait).forEach((name) => {
    // required properties are not excluded but ignored
    if (!exclusions.has(name) || ("required" in trait[name]! && trait[name]?.required)) {
      newTrait[name] = trait[name]!;
    } else {
      // excluded properties are replaced by required properties
      newTrait[name] = makeRequiredPropDesc(name);
    }
  });

  return Object.freeze(newTrait) as any;
}

/**
 * var newTrait = override(trait_1, trait_2, ..., trait_N)
 *
 * @returns a new trait with all of the combined properties of the
 *          argument traits.  In contrast to 'compose', 'override'
 *          immediately resolves all conflicts resulting from this
 *          composition by overriding the properties of later
 *          traits. Trait priority is from left to right. I.e. the
 *          properties of the leftmost trait are never overridden.
 *
 *  override is associative:
 *    override(t1,t2,t3) is equivalent to override(t1, override(t2, t3)) or
 *    to override(override(t1, t2), t3)
 *  override is not commutative: override(t1,t2) is not equivalent
 *    to override(t2,t1)
 *
 * override() returns an empty trait
 * override(trait_1) returns a trait equivalent to trait_1
 */

type override<self, trait> = {
  [K in keyof self | keyof trait]: K extends keyof self
    ? self[K] extends Required<any>
      ? K extends keyof trait
        ? trait[K]
        : self[K] // overwrite required property
      : self[K] // keep self
    : K extends keyof trait
      ? trait[K]
      : never;
};
type Override<Traits, self = {}> = Traits extends [infer T, ...infer R] ? Override<R, override<self, T>> : self;

function override<T extends any[]>(...traits: T): Override<T> {
  const newTrait: Record<string, PropertyDescriptor & { required?: boolean }> = {};
  traits.forEach(function (trait) {
    Object.getOwnPropertyNames(trait).forEach(function (name) {
      const pd = trait[name]!;
      // add this trait's property to the composite trait only if
      // - the trait does not yet have this property
      // - or, the trait does have the property, but it's a required property
      if (!newTrait.hasOwnProperty(name) || newTrait[name]!.required) {
        newTrait[name] = pd;
      }
    });
  });
  return Object.freeze(newTrait) as Override<T>;
}

/**
   * var newTrait = rename(map, trait)
   *
   * @param map an object whose own properties serve as a mapping from
            old names to new names.
   * @param trait a trait object
   * @returns a new trait with the same properties as the original trait,
   *          except that all properties whose name is an own property
   *          of map will be renamed to map[name], and a 'required' property
   *          for name will be added instead.
   *
   * rename({a: 'b'}, t) eqv compose(exclude(['a'],t),
   *                                 { a: { required: true },
   *                                   b: t[a] })
   *
   * For each renamed property, a required property is generated.  If
   * the map renames two properties to the same name, a conflict is
   * generated.  If the map renames a property to an existing
   * unrenamed property, a conflict is generated.
   *
   * Note: rename(A, rename(B, t)) is equivalent to rename(\n ->
   * A(B(n)), t) Note: rename({...},exclude([...], t)) is not eqv to
   * exclude([...],rename({...}, t))
   */
type Rename<Map, Trait> = {
  [K in keyof Trait as K extends keyof Map ? (Map[K] extends PropertyKey ? Map[K] : K) : K]: Trait[K];
};

function rename<
  const NameMap extends Record<string, string>,
  Trait extends Record<string, PropertyDescriptor & { required?: boolean }>,
>(map: NameMap, trait: Trait): Rename<NameMap, Trait> {
  const renamedTrait: Record<string, PropertyDescriptor & { required?: boolean }> = {};
  Object.getOwnPropertyNames(trait).forEach((name) => {
    // required props are never renamed
    if (map.hasOwnProperty(name) && !trait[name]?.required) {
      const alias = map[name]!; // alias defined in map
      if (renamedTrait.hasOwnProperty(alias) && !renamedTrait[alias]?.required) {
        // could happen if 2 props are mapped to the same alias
        renamedTrait[alias] = makeConflictingPropDesc(alias);
      } else {
        // add the property under an alias
        renamedTrait[alias] = trait[name]!;
      }
      // add a required property under the original name
      // but only if a property under the original name does not exist
      // such a prop could exist if an earlier prop in the trait was
      // previously aliased to this name
      if (!renamedTrait.hasOwnProperty(name)) {
        renamedTrait[name] = makeRequiredPropDesc(name);
      }
    } else {
      // no alias defined
      if (renamedTrait.hasOwnProperty(name)) {
        // could happen if another prop was previously aliased to name
        if (!trait[name]?.required) {
          renamedTrait[name] = makeConflictingPropDesc(name);
        }
        // else required property overridden by a previously aliased
        // property and otherwise ignored
      } else {
        renamedTrait[name] = trait[name]!;
      }
    }
  });

  return Object.freeze(renamedTrait) as Rename<NameMap, Trait>;
}

/**
   * var newTrait = resolve({ oldName: 'newName', excludeName:
   * undefined, ... }, trait)
   *
   * This is a convenience function combining renaming and
   * exclusion. It can be implemented as <tt>rename(map,
   * exclude(exclusions, trait))</tt> where map is the subset of
   * mappings from oldName to newName and exclusions is an array of
   * all the keys that map to undefined (or another falsy value).
   *
   * @param resolutions an object whose own properties serve as a
            mapping from old names to new names, or to undefined if
            the property should be excluded
   * @param trait a trait object
   * @returns a resolved trait with the same own properties as the
   * original trait.
   *
   * In a resolved trait, all own properties whose name is an own property
   * of resolutions will be renamed to resolutions[name] if it is truthy,
   * or their value is changed into a required property descriptor if
   * resolutions[name] is falsy.
   *
   * Note, it's important to _first_ exclude, _then_ rename, since exclude
   * and rename are not associative, for example:
   * rename({a: 'b'}, exclude(['b'], trait({ a:1,b:2 }))) eqv trait({b:1})
   * exclude(['b'], rename({a: 'b'}, trait({ a:1,b:2 }))) eqv
   * trait({b:Trait.required})
   *
   * writing resolve({a:'b', b: undefined},trait({a:1,b:2})) makes it
   * clear that what is meant is to simply drop the old 'b' and rename
   * 'a' to 'b'
   */
type Resolve<Map, Trait> = {
  [K in keyof Trait as K extends keyof Map ? (Map[K] extends PropertyKey ? Map[K] : K) : K]: K extends keyof Map
    ? Map[K] extends undefined
      ? RequiredPropertyDescriptor<Trait[K]>
      : Trait[K]
    : Trait[K];
};

function resolve<
  Resolutions extends Record<string, string | undefined>,
  Trait extends Record<string, PropertyDescriptor>,
>(resolutions: Record<string, string | undefined>, trait: Trait): Resolve<Resolutions, Trait> {
  const renames: Record<string, string> = {};
  const exclusions: string[] = [];
  // preprocess renamed and excluded properties
  for (const name in resolutions) {
    if (resolutions.hasOwnProperty(name)) {
      if (resolutions[name]) {
        // old name -> new name
        renames[name] = resolutions[name];
      } else {
        // name -> undefined
        exclusions.push(name);
      }
    }
  }
  return rename(renames, exclude(trait, ...exclusions)) as any;
}

// declare function fn2<T>(args: Magic<T>): any;

type TraitPropertyDescriptor<Type = any> =
  | RequiredPropertyDescriptor<Type>
  | MethodPropertyDescriptor<Type>
  | ConflictPropertyDescriptor<Type>
  | PropertyDescriptorBase<Type>;

type Create<self, trait> =
  {
    //prettier-ignore
  [K in keyof self | keyof trait]: 
    K extends keyof self  ? 
       (self[K] extends Required<any> ? (K extends keyof trait ? trait[K] // overwrite required property
                                                               : self[K]) // keep required property
                                      :  K extends keyof trait ? trait[K] extends Required<any> ? self[K] 
                                                                                                : trait[K]  
                                                                : self[K]) // keep self property
    : K extends keyof trait ? trait[K] : never;
};

type HasConfilct<Trait> = [
  {
    [K in keyof Trait]: Trait[K] extends ConflictPropertyDescriptor | RequiredPropertyDescriptor ? K : never;
  }[keyof Trait],
] extends [never]
  ? false
  : true;
type inferTrait<T> = T extends Trait<infer R> ? R : never;

function create<const Proto extends object, const $Trait extends Trait<Record<string, unknown>>>(
  proto: Proto,
  trait: $Trait,
): HasConfilct<Create<Proto, inferTrait<$Trait>>> extends true ? never : Create<Proto, inferTrait<$Trait>> {
  const self = Object.create(proto);
  const properties: PropertyDescriptorMap = {};

  Object.getOwnPropertyNames(trait).forEach((name) => {
    const pd = trait[name]!;
    console.log(trait);
    // check for remaining 'required' properties
    // Note: it's OK for the prototype to provide the properties
    // Fixed: proto can be null: https://github.com/traitsjs/traits.js/issues/11
    if ("required" in pd && pd.required) {
      if (proto === null || !(name in proto)) {
        throw new Error("Missing required property: " + name);
      }
    } else if ("conflict" in pd && pd.conflict) {
      // check for remaining conflicting properties
      throw new Error("Remaining conflicting property: " + name);
    } else if ("value" in pd) {
      // data property
      // freeze all function properties and their prototype
      if ("method" in pd && pd.method) {
        // the property is meant to be used as a method
        // bind 'this' in trait method to the composite object
        properties[name] = {
          value: Object.freeze(pd.value.bind(self)),
          enumerable: pd.enumerable,
          configurable: pd.configurable,
          writable: pd.writable,
        };
      } else {
        properties[name] = pd;
      }
    } else {
      // accessor property
      properties[name] = {
        get: pd.get ? Object.freeze(pd.get.bind(self)) : undefined,
        set: pd.set ? Object.freeze(pd.set.bind(self)) : undefined,
        enumerable: pd.enumerable,
        configurable: pd.configurable,
      };
    }
  });

  Object.defineProperties(self, properties);
  return Object.freeze(self);
}

it("create", () => {
  const proto = { a: 1 };
  const t = trait({ b: 2 });
  const c = create(proto, t);
  expect({ a: c.a, b: c.b }).toEqual({ a: 1, b: 2 }); // Note  proto type is not enumerable -> test would fail
});

it("throw required", () => {
  const proto = { a: 1 };
  const t = trait({ b: required<number>() });
  expect(() => create(proto, t)).toThrow();
});

it("create required", () => {
  const proto = { b: 1 };
  const t = trait({ b: required<number>() });
  const created = create(proto, t);
  expect({ b: created.b }).toEqual({ b: 1 });
});

it("create required", () => {
  const proto = { b: required<number>() };
  const t = trait({ b: 1 });
  const created = create(proto, t);
  expect({ b: created.b }).toEqual({ b: 1 });
});
it("create conflict", () => {
  const proto = { b: 1 };
  const t = trait({ b: 3 });
  const created = create(proto, t);
  expect(created.b).toBe(3);
});
it("conflict throw", () => {
  const proto = { b: 1 };
  expect(() => create(proto, { b: makeConflictingPropDesc("b") })).toThrow();
});

/**
 * Tests whether two traits are equivalent. T1 is equivalent to T2 iff
 * both describe the same set of property names and for all property
 * names n, T1[n] is equivalent to T2[n]. Two property descriptors are
 * equivalent if they have the same value, accessors and attributes.
 *
 * @return a boolean indicating whether the two argument traits are
 *         equivalent.
 */
function eqv(trait1: Trait<any>, trait2: Trait<any>): boolean {
  const names1 = Object.getOwnPropertyNames(trait1);
  const names2 = Object.getOwnPropertyNames(trait2);
  if (names1.length !== names2.length) return false;

  let name;
  for (var i = 0; i < names1.length; i++) {
    name = names1[i];
    if (!trait2[name!] || !isSameDesc(trait1[name!]!, trait2[name!]!)) {
      return false;
    }
  }
  return true;
}
