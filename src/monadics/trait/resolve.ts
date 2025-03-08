import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { exclude } from "./exclude";
import { Rename, rename } from "./rename";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

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
type Exclusions<Resolutions extends Record<string, string | undefined>> = {
  [K in keyof Resolutions]: Resolutions[K] extends undefined ? K : never;
}[keyof Resolutions];

type RenameMap<Resolutions extends Record<string, string | undefined>> = {
  [K in keyof Resolutions]: Resolutions[K] extends string ? Resolutions[K] : never;
};

export type Resolve<
  Resolutions extends Record<string, string | undefined>,
  $Trait extends Record<string, unknown>,
> = Rename<RenameMap<Resolutions>, Exclude<$Trait, Exclusions<Resolutions>>>;

export function resolve<Resolutions extends Record<string, string | undefined>, $Trait extends Record<string, unknown>>(
  resolutions: Record<string, string | undefined>,
  trait: Trait<$Trait>,
): Resolve<Resolutions, $Trait> {
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
  return rename(renames, exclude(trait, ...exclusions) as any) as any;
}

// --------------------------------------------------------------
// Test Suite
// --------------------------------------------------------------
describe("resolve() function", () => {
  // ----------------------------------------------------------------
  // 1. Type-Level Tests
  // ----------------------------------------------------------------
  describe("Type-level tests for Resolve<Resolutions, $Trait>", () => {
    it("excludes properties mapped to undefined, renames properties mapped to strings", () => {
      type OriginalTrait = {
        a: number;
        b: string;
        c: boolean;
      };
      // 'b' => undefined => exclude, 'a' => 'x' => rename, 'c' => no mention => keep
      type Resolutions = {
        a: "x";
        b: undefined;
      };
      type Computed = Resolve<Resolutions, OriginalTrait>;
      /**
       * Step by step:
       *   1) Exclude<OriginalTrait, "b"> => property 'b' becomes required
       *   2) Rename< { a:..., b: RequiredTrait<...>, c:... }, { a: "x" }>
       *      => 'a' => rename => 'x' + original 'a' => required
       *      => 'b' is already required => no rename
       *      => 'c' remains
       */
      type Expected = {
        // 'a' becomes required under the original name
        a: RequiredTrait<number>;
        // the new alias 'x'
        x: number;
        // 'b' was excluded => it becomes required
        b: RequiredTrait<string>;
        // 'c' remains
        c: boolean;
      };

      AssertTrue<Equals<Computed, Expected>>();
    });

    it("ignores properties not mentioned in Resolutions", () => {
      type OriginalTrait = {
        foo: number;
        bar: string;
      };
      type Resolutions = {
        // only mention 'foo'
        foo: undefined;
      };
      // => 'foo' is excluded => required
      // => 'bar' is unchanged
      type Computed = Resolve<Resolutions, OriginalTrait>;
      type Expected = {
        foo: RequiredTrait<number>;
        bar: string;
      };
      AssertTrue<Equals<Computed, Expected>>();
    });

    it("respects required properties (they won't rename or exclude if you coded it that way)", () => {
      // For demonstration, let's say 'password' is required => exclude => remains required
      type OriginalTrait = {
        password: RequiredTrait<string>;
        email: string;
      };
      type Resolutions = {
        password: undefined; // attempt to exclude
        email: "userEmail"; // rename
      };
      // The exclude step tries to exclude password => but it's already required => it remains
      // Then rename => 'email' => 'userEmail'
      type Computed = Resolve<Resolutions, OriginalTrait>;
      type Expected = {
        password: RequiredTrait<string>;
        email: RequiredTrait<string>; // original name is replaced with required
        userEmail: string; // alis
      };
      AssertTrue<Equals<Computed, Expected>>();
    });
  });

  // ----------------------------------------------------------------
  // 2. Runtime Tests
  // ----------------------------------------------------------------
  describe("Runtime tests for resolve()", () => {
    it("renames some properties, excludes others, and leaves the rest untouched", () => {
      const original: Trait<{ a: number; b: number; c: number; d: number }> = {
        a: { _type: null!, value: 1, enumerable: true, configurable: true },
        b: { _type: null!, value: 2, enumerable: true, configurable: true },
        c: { _type: null!, value: 3, enumerable: true, configurable: true },
        d: { _type: null!, value: 4, enumerable: true, configurable: true },
      };
      const resolutions: Record<string, string | undefined> = {
        // rename 'a' -> 'alpha'
        a: "alpha",
        // exclude 'b'
        b: undefined,
        // not mentioning 'c' => keep
        // rename 'missingKey' => '??' won't matter since 'missingKey' isn't in trait
      };

      const resolved: any = resolve(resolutions, original);
      // => 'a' -> alias 'alpha'
      expect(resolved.alpha.value).toBe(1);
      // => 'a' => required
      expect(resolved.a.required).toBe(true);
      // => 'b' => excluded => required
      expect(resolved.b.required).toBe(true);
      // => 'c' => remains
      expect(resolved.c.value).toBe(3);
      // => 'd' => remains
      expect(resolved.d.value).toBe(4);
    });

    it("does nothing for keys not found in the trait", () => {
      const original: Trait<{ x: number }> = {
        x: { _type: null!, value: 123, enumerable: true, configurable: true },
      };
      const resolutions = { notAKey: undefined, anotherNotKey: "alias" };
      // => No changes in practice
      const result: any = resolve(resolutions, original);

      expect(result.x.value).toBe(123);
      // The keys from resolutions that aren't in 'original' do nothing
      expect(Object.keys(result)).toEqual(["x"]);
    });

    it("first excludes properties (making them required), then renames as per the 'rename()' logic", () => {
      const original: Trait<{ b: number }> = {
        b: { _type: null!, value: 2, enumerable: true, configurable: true },
      };
      const resolutions = { b: "B" };
      // If your exclude logic doesn't override required properties,
      // and b is not required => we exclude or rename?
      // Actually, if 'b' => "B", that means rename, not exclude.
      // Just an example for demonstration:
      const result: any = resolve(resolutions, original);
      // => 'b' => alias 'B'
      expect(result.B.value).toBe(2);
      // => 'b' => now required
      expect(result.b.required).toBe(true);
    });

    it("returns a frozen trait object", () => {
      const original: Trait<{ one: number }> = {
        one: { _type: null!, value: 1, enumerable: true, configurable: true },
      };
      const resolutions = {};
      const result = resolve(resolutions, original);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });
});
