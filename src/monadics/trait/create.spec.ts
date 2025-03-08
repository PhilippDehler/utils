import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { __hasConflict, Create, create } from "./create";
import { makeConflictingPropDesc } from "./property-descriptors";
import { required, RequiredTrait } from "./required";
import { trait, Trait } from "./trait";

describe("create() function", () => {
  describe("Basic behavior", () => {
    it("creates a composite object from a prototype and a trait", () => {
      // Explanation: Ensures basic creation merges properties from both proto and trait.
      const proto = { a: 1 };
      const t = trait({ b: 2 });
      const c = create(proto, t);
      expect({ a: c.a, b: c.b }).toEqual({ a: 1, b: 2 });
    });
  });

  describe("Required property handling", () => {
    it("throws an error if a required property is missing on the prototype", () => {
      // Explanation: Verifies that a 'required' property triggers an error if the prototype doesn't provide it.
      const proto = { a: 1 };
      const t = trait({ b: required<number>() });
      //@ts-expect-error
      expect(() => create(proto, t)).toThrow("Missing required property: b");
    });

    it("uses a required property provided by the prototype", () => {
      // Explanation: Ensures that if the prototype provides a matching required property, creation succeeds.
      const proto = { b: 1 };
      const t = trait({ b: required<number>() });
      const created = create(proto, t);
      expect({ b: created.b }).toEqual({ b: 1 });
    });

    it("succeeds if the prototype itself marks a property as required and the trait supplies it", () => {
      // Explanation: Confirms creation works when the prototype is required and the trait's property satisfies it.
      const proto = { b: required<number>() };
      const t = trait({ b: 1 });
      const created = create(proto, t);
      expect({ b: created.b }).toEqual({ b: 1 });
    });
  });

  describe("Conflict handling", () => {
    it("overrides prototype property with trait property when no explicit conflict descriptor is set", () => {
      // Explanation: If both proto and trait define a property, trait wins, provided there's no conflict descriptor.
      const proto = { b: 1 };
      const t = trait({ b: 3 });
      const created = create(proto, t);
      expect(created.b).toBe(3);
    });

    it("throws an error for an explicit conflict property descriptor", () => {
      // Explanation: Validates that if a property is marked conflicting, creation throws an error.
      const proto = { b: 1 };
      expect(() => create(proto, { b: makeConflictingPropDesc("b") } as unknown as Trait<{ b: unknown }>)).toThrow(
        "Remaining conflicting property: b",
      );
    });
  });

  describe("Additional scenarios", () => {
    it("composes methods from the trait onto the object, binding 'this' correctly", () => {
      // Explanation: If trait has a method property, it should be frozen and bound to the created object.
      const proto = { x: 10 };
      const t = trait({
        doubleX() {
          return this.x * 2;
        },
      });
      const created = create(proto, t);
      expect(created.doubleX()).toBe(20);

      // Ensure the function is frozen
      expect(Object.isFrozen(created.doubleX)).toBe(true);
    });

    it("handles accessor properties from the trait (get/set) correctly", () => {
      // Explanation: If trait provides an accessor, the descriptor should bind & freeze the get/set functions.
      const proto = { _count: 0 };
      // note it's impossbile to define or identity a this property in typescript
      const t = trait({
        _count: required<number>(),
        get count() {
          //@ts-expect-error
          return this._count; // works runtime wise
        },
        set count(val: number) {
          //@ts-expect-error
          this._count = val < 0 ? 0 : val;
        },
      });
      //   Typesafe alternative
      //   trait({
      //     _count: required<number>(),
      //     getCount() {
      //       return this._count;
      //     },
      //   });
      const created = create(proto, t);
      expect(() => (created.count = 5)).toThrow(); // object is not extensible
      expect(created.count).toBe(0); // object is not extensible

      // Ensure prototypes are frozen
      expect(Object.isFrozen(Object.getOwnPropertyDescriptor(created, "count")?.get?.prototype)).toBe(true);
      expect(Object.isFrozen(Object.getOwnPropertyDescriptor(created, "count")?.set?.prototype)).toBe(true);
    });
  });
});

// ----------------------------------------------------------------
// Type Tests
// ----------------------------------------------------------------

/**
 * These tests verify that Create<> and HasConfilct<> produce
 * the expected type-level outcomes in a variety of scenarios.
 */
describe("Type tests for Create and HasConfilct", () => {
  it("merges non-conflicting properties correctly at the type level", () => {
    type Proto = { a: number; c: () => void };
    type TraitProps = { b: string };

    type Merged = Create<Proto, TraitProps>;
    type __HasConflict = __hasConflict<Proto, TraitProps>;

    // We expect no conflict, so HasConflict should produce an object of all `false`.
    type ExpectedHasConflict = {
      a: false; // only in proto => no conflict
      b: false; // only in trait => no conflict
      c: false; // only in proto => no conflict
    };

    // Merged should be { a: number; c: () => void; b: string }
    type ExpectedMerged = {
      a: number;
      c: () => void;
      b: string;
    };

    // Compile-time check:
    AssertTrue<Equals<__HasConflict, ExpectedHasConflict>>();
    AssertTrue<Equals<Merged, ExpectedMerged>>();
  });

  it("treats a trait property typed as 'never' as a conflict", () => {
    type Proto = { a: number };
    type TraitProps = { a: never; b: string };

    type Merged = Create<Proto, TraitProps>;
    type __HasConflict = __hasConflict<Proto, TraitProps>;

    // We expect a conflict on property 'a', so HasConflict should show { a: true, b: false }.
    type ExpectedHasConflict = {
      a: true;
      b: false;
    };

    // Merged for 'a' would become `never`, effectively meaning we can't create a stable combined type.
    // So 'a' is `never`, and 'b' is `string`, but since 'a' is never => entire type usage might be invalid.
    // For demonstration, we can see that property 'a' would be `never`, so effectively Merged is { a: never; b: string }.

    type ExpectedMerged = {
      a: never;
      b: string;
    };

    AssertTrue<Equals<__HasConflict, ExpectedHasConflict>>();
    AssertTrue<Equals<Merged, ExpectedMerged>>();
  });

  it("treats a trait property typed as RequiredTrait<T> as no conflict", () => {
    type Proto = { a: number };
    type TraitProps = { a: RequiredTrait<number> };

    type Merged = Create<Proto, TraitProps>;
    type __HasConflict = __hasConflict<Proto, TraitProps>;

    // No conflict because the proto has 'a' as number, and trait says 'a' is required.
    type ExpectedHasConflict = {
      a: false;
    };

    // Merged is effectively: { a: number }
    // because the trait is 'required<number>' and the proto has it.
    type ExpectedMerged = {
      a: number;
    };

    AssertTrue<Equals<__HasConflict, ExpectedHasConflict>>();
    AssertTrue<Equals<Merged, ExpectedMerged>>();
  });
});
