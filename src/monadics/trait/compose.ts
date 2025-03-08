import { describe } from "node:test";
import { expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { isSameDesc, makeConflictingPropDesc } from "./property-descriptors";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

/** Utility for compile-time checks */

export type Compose<$traits, $proto = {}> = $traits extends [Trait<infer Tr>, ...infer R]
  ? Compose<R, __concat<$proto, Tr>>
  : Trait<$proto>;

/**
 * The concat type merges two trait types at the type level.
 * If both sides define the same property:
 *  - If the first is required, we take the second.
 *  - If the second is required, we take the first.
 *  - Otherwise, it’s considered a conflict.
 */
//prettier-ignore
export type __concat<$newTrait, $proto> = {
  [K in keyof $newTrait | keyof $proto]: 
  // name is in both $newTrait and $bTrait  and $newTrait is required -> take $bTrait
  K extends keyof $newTrait ? K extends keyof $proto ? $newTrait[K] extends RequiredTrait<any> ? $proto[K]
  // name is in both $newTrait and $bTrait  and $newTrait is defined & $bTrait is required -> take $bTrait
                                                      : $proto[K] extends RequiredTrait<any> ? $newTrait[K]
  // name is in both $newTrait and $bTrait  and $newTrait is defined & $bTrait is defined -> conflict
  // conflict: We can't do an identity check here so we assume a conflict. We could do an structural equality check here but that would be too expensive would create false positives
                                                      : never
  // name is in $newTrait but not in $aTrait -> take $newTrait  
                                                      : $newTrait[K] 
  // name is in $bTrait but not in $newTrait -> take $bTrait
                          : K extends keyof $proto ? $proto[K]   
  // name is in neither $newTrait nor $bTrait -> never (should not happen)
                                                    : never
};

export function compose<$traits extends Trait<any>[]>(...traits: $traits): Compose<$traits> {
  const newTrait: any = {};
  traits.forEach((trait) => {
    Object.getOwnPropertyNames(trait).forEach((name) => {
      const pd = trait[name]!;
      if (!newTrait.hasOwnProperty(name)) newTrait[name] = pd;
      if (newTrait[name]?.required) newTrait[name] = pd;
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
    });
  });

  return Object.freeze(newTrait);
}

// ---------------------------------------------------------------------
// Type-Level Tests
// ---------------------------------------------------------------------
describe("Type-level tests for compose() and concat()", () => {
  it("merges two required properties by taking the last required property", () => {
    type T11 = __concat<{ a: RequiredTrait<1> }, { a: RequiredTrait<2> }>;
    // The last required overwrites the first
    AssertTrue<Equals<T11, { a: RequiredTrait<2> }>>();
  });

  it("retains a required property if the other side is empty", () => {
    type T12 = __concat<{ a: RequiredTrait<1> }, {}>;
    // Should stay as { a: RequiredTrait<1> }
    AssertTrue<Equals<T12, { a: RequiredTrait<1> }>>();
  });

  it("marks it as never (conflict) if both sides are normal but different", () => {
    type T15 = __concat<{ a: 1 }, { a: 2 }>;
    // Because both are normal and differ => conflict => never
    AssertTrue<Equals<T15, { a: never }>>();
  });

  it("takes the new property if the first side is empty", () => {
    type T16 = __concat<{}, { a: 2 }>;
    AssertTrue<Equals<T16, { a: 2 }>>();
  });

  it("demonstrates multiple-trait composition logic", () => {
    type T20 = Compose<[Trait<{ a: 1; b: 2 }>, Trait<{ b: null }>]>;
    // Since both are normal but different => b is never
    // So T20 => Trait<{ a: 1; b: never }>
    AssertTrue<Equals<T20, Trait<{ a: 1; b: never }>>>();
  });

  // Additional type-level scenario
  it("overwrites required with normal property and normal ignores required property", () => {
    // Overwriting required with normal
    type TRequiredThenNormal = __concat<{ a: RequiredTrait<2> }, { a: 1 }>;
    AssertTrue<Equals<TRequiredThenNormal, { a: 1 }>>();

    // Overwriting normal with required
    type TNormalThenRequired = __concat<{ a: 1 }, { a: RequiredTrait<2> }>;
    // This merges => { a: never } or { a: ??? }, depending on your logic.
    // Currently, the type definition says second is required => keep the first.
    // So this yields never. Let's see:
    AssertTrue<Equals<TNormalThenRequired, { a: 1 }>>();
  });
});

// ---------------------------------------------------------------------
// Runtime Tests for compose()
// ---------------------------------------------------------------------
describe("Runtime tests for compose()", () => {
  it("merges distinct properties from two traits without conflict", () => {
    const t1: Trait<{ x: number }> = {
      x: { _type: null!, value: 1, enumerable: true, configurable: true, writable: true },
    };
    const t2: Trait<{ y: number }> = {
      y: { _type: null!, value: 2, enumerable: true, configurable: true, writable: true },
    };
    const merged = compose(t1, t2);

    expect(Object.keys(merged)).toEqual(["x", "y"]);
    expect(merged.x.value).toBe(1);
    expect(merged.y.value).toBe(2);
  });

  it("overrides a required property from the first trait if the second trait has a normal property of the same name", () => {
    const t1: Trait<{ x: RequiredTrait<number> }> = {
      x: { required: true, enumerable: false, value: null, _type: null! },
    };
    const t2: Trait<{ x: number }> = {
      x: { _type: null!, value: 42, enumerable: true, configurable: true, writable: true },
    };
    const merged = compose(t1, t2);

    // The second trait's normal property "x" overwrote the first required x
    expect(merged.x.value).toBe(42);
  });

  it("creates a conflict if two normal properties differ", () => {
    const t1: Trait<{ x: number }> = {
      x: { _type: null!, value: 1, enumerable: true, configurable: true, writable: true },
    };
    const t2: Trait<{ x: number }> = {
      x: { _type: null!, value: 2, enumerable: false, configurable: true, writable: true },
    };
    const merged = compose(t1, t2);

    // Because x is different, we expect a conflict
    expect(merged.x.conflict).toBe(true);
  });

  it("does not conflict if both traits share the exact same property descriptor reference", () => {
    const sharedDesc = {
      value: 99,
      enumerable: true,
      configurable: true,
      writable: true,
      _type: null!,
    };
    const t1: Trait<{ x: number }> = { x: sharedDesc };
    const t2: Trait<{ x: number }> = { x: sharedDesc };
    const merged = compose(t1, t2);

    expect(merged.x).toBe(sharedDesc);
    expect(merged.x.value).toBe(99);
    // No conflict
    expect(merged.x.conflict).toBeUndefined();
  });

  // Additional test: Merging three traits with partial overlap
  it("merges three traits, causing one conflict and one successful merge", () => {
    const t1: Trait<{ a: number; b: number }> = {
      a: { _type: null!, value: 10, enumerable: true, configurable: true, writable: true },
      b: { _type: null!, value: 20, enumerable: true, configurable: true, writable: true },
    };
    const t2: Trait<{ b: number }> = {
      b: { _type: null!, value: 999, enumerable: true, configurable: true, writable: true },
    };
    const t3: Trait<{ c: number }> = {
      c: { _type: null!, value: 30, enumerable: true, configurable: true, writable: true },
    };

    // t1 + t2 => conflict on 'b'
    // then t3 merges in 'c' with no conflict
    const merged = compose(t1, t2, t3);
    expect(Object.keys(merged)).toEqual(["a", "b", "c"]);
    expect(merged.a.value).toBe(10);
    expect(merged.b.conflict).toBe(true);
    expect(merged.c.value).toBe(30);
  });
});
