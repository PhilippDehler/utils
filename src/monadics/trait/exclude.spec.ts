import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { exclude, Exclude } from "./exclude";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

describe("exclude() function tests", () => {
  describe("Type-level tests for Exclude<$proto, Names>", () => {
    it("marks named normal properties as RequiredTrait<T>", () => {
      type Original = {
        a: string;
        b: number;
        c: boolean;
      };
      // Excluding "b" => 'b' should become RequiredTrait<number>
      type Result = Exclude<Original, "b">;
      // Check compile-time result
      type Expected = {
        a: string;
        b: RequiredTrait<number>;
        c: boolean;
      };
      AssertTrue<Equals<Result, Expected>>();
    });

    it("retains properties that are already RequiredTrait if excluded", () => {
      type Original = {
        a: RequiredTrait<string>;
        b: number;
      };
      // Excluding "a" => 'a' stays RequiredTrait<string>, 'b' => normal
      type Result = Exclude<Original, "a">;
      type Expected = {
        a: RequiredTrait<string>;
        b: number;
      };
      AssertTrue<Equals<Result, Expected>>();
    });

    it("does not affect properties not in the exclusion list", () => {
      type Original = {
        x: number;
        y: string;
      };
      // Excluding "z" which doesn't exist => no change
      type Result = Exclude<Original, "z">;
      // Should remain the same as Original
      AssertTrue<Equals<Result, Original>>();
    });

    it("handles multiple exclusions, turning them all into RequiredTrait", () => {
      type Original = {
        one: number;
        two: string;
        three: boolean;
      };
      // Excluding both "one" and "three"
      type Result = Exclude<Original, "one" | "three">;
      type Expected = {
        one: RequiredTrait<number>;
        two: string;
        three: RequiredTrait<boolean>;
      };
      AssertTrue<Equals<Result, Expected>>();
    });
  });

  describe("Runtime tests for exclude(...) function", () => {
    it("replaces named property descriptors with required descriptors", () => {
      const traitA: Trait<{ x: number; y: number }> = {
        x: { _type: null!, value: 10, enumerable: true, configurable: true, writable: true },
        y: { _type: null!, value: 20, enumerable: false, configurable: true, writable: true },
      };

      const excludedTrait: any = exclude(traitA, "y");

      // 'y' should now be a required property descriptor
      expect(excludedTrait.x.value).toBe(10);
      expect(excludedTrait.y.required).toBe(true);
      expect(excludedTrait.y.value).toBeUndefined(); // required descriptors typically have no 'value'
    });

    it("leaves a property alone if it is already 'required'", () => {
      const traitA: Trait<{ x: RequiredTrait<number>; y: number }> = {
        x: { _type: null!, required: true, enumerable: true, value: null },
        y: { _type: null!, value: 42, enumerable: true, configurable: true, writable: true },
      };

      // Attempt to exclude "x" which is already required
      const excludedTrait: any = exclude(traitA, "x");

      expect(excludedTrait.x.required).toBe(true);
      // 'y' was not excluded, so remains normal
      expect(excludedTrait.y.value).toBe(42);
    });

    it("excludes multiple properties, turning them all into required descriptors", () => {
      const traitA: Trait<{ a: number; b: number; c: number }> = {
        a: { _type: null!, value: 1, enumerable: true, configurable: true, writable: true },
        b: { _type: null!, value: 2, enumerable: true, configurable: true, writable: true },
        c: { _type: null!, value: 3, enumerable: true, configurable: true, writable: true },
      };

      const excluded: any = exclude(traitA, "a", "c");

      // 'a' and 'c' => required
      expect(excluded.a.required).toBe(true);
      expect(excluded.c.required).toBe(true);
      // 'b' => unchanged
      expect(excluded.b.value).toBe(2);
    });

    it("freezes the returned trait object", () => {
      const traitA: Trait<{ x: number }> = {
        x: { _type: null!, value: 10, enumerable: true, configurable: true, writable: true },
      };

      const newT = exclude(traitA, "x");
      expect(Object.isFrozen(newT)).toBe(true);
    });
  });
});
