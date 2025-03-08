import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { Override, type __override, override } from "./override";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

describe("Type-level tests for override()", () => {
  it("overwrites a RequiredTrait<T> on the left with the right's property", () => {
    type TLeft = { a: RequiredTrait<number>; b: string };
    type TRight = { a: { foo: "normal" }; c: boolean };

    // The left side for 'a' is required => we should take the right side's 'a'
    type Result = __override<TLeft, TRight>;
    type Expected = {
      a: { foo: "normal" }; // overwritten from TRight
      b: string; // from TLeft
      c: boolean; // new from TRight
    };

    AssertTrue<Equals<Result, Expected>>();
  });

  it("keeps normal properties from the left if they exist", () => {
    type TLeft = { x: number; y: string };
    type TRight = { x: { foo: "override" }; z: boolean };

    // Because left.x is normal, we keep it => x: number
    // We add z from the right => z: boolean
    // We do not override y from the left => y: string
    type Result = __override<TLeft, TRight>;
    type Expected = {
      x: number;
      y: string;
      z: boolean;
    };

    AssertTrue<Equals<Result, Expected>>();
  });

  it("applies override left-to-right across multiple traits", () => {
    // This test uses the 'Override' variadic type
    type T1 = { a: RequiredTrait<number>; b: number };
    type T2 = { a: string; c: boolean };
    type T3 = { b: RequiredTrait<"some">; d: number };

    // Step by step:
    // override(T1, T2) => { a: string; b: number; c: boolean }
    // override(...that..., T3) =>
    //     left has { a: string; b: number; c: boolean }
    //     T3 => { b: RequiredTrait<"some">; d: number }
    //     b is normal => keep left => b: number
    //     b from T3 is required => that means we would override with T3's b
    //           but only if the left side's property was itself required or didn't exist
    //           since the left is normal => we keep the left => b: number
    // So final => { a: string; b: number; c: boolean; d: number }
    type Result = Override<[Trait<T1>, Trait<T2>, Trait<T3>]>;

    type Expected = {
      a: string;
      b: number;
      c: boolean;
      d: number;
    };
    AssertTrue<Equals<Result, Expected>>();
  });

  it("handles empty input producing an empty object", () => {
    // override() -> empty trait => {}
    type Result = Override<[]>;
    AssertTrue<Equals<Result, {}>>();
  });
});

describe("Runtime tests for override()", () => {
  it("keeps normal properties from the left if they exist on the left", () => {
    const left: Trait<{ a: number; b: string }> = {
      a: { _type: null!, value: 123, enumerable: true, configurable: true, writable: true },
      b: { _type: null!, value: "left", enumerable: true, configurable: true, writable: true },
    };
    const right: Trait<{ a: number; c: boolean }> = {
      a: { _type: null!, value: 999, enumerable: true, configurable: true, writable: true },
      c: { _type: null!, value: true, enumerable: true, configurable: true, writable: true },
    };

    // According to override, if the left property is normal, we keep it
    // => final 'a' should remain 123
    const merged: any = override(left, right);

    // 'a' is from left
    expect(merged.a.value).toBe(123);
    // 'b' is from left
    expect(merged.b.value).toBe("left");
    // 'c' is new from right
    expect(merged.c.value).toBe(true);
  });

  it("overwrites left property if it is a RequiredTrait, taking the right property", () => {
    const left: Trait<{ foo: RequiredTrait<number>; b: string }> = {
      foo: { required: true, enumerable: false, _type: null!, value: null },
      b: { _type: null!, value: "keep me", enumerable: true, configurable: true, writable: true },
    };
    const right: Trait<{ foo: number }> = {
      foo: { _type: null!, value: 42, enumerable: true, configurable: true, writable: true },
    };

    const merged: any = override(left, right);

    // Because left.foo was required, it should now come from the right => 42
    expect(merged.foo.value).toBe(42);
    // 'b' remains from the left
    expect(merged.b.value).toBe("keep me");
  });

  it("merges multiple traits left-to-right", () => {
    const t1: Trait<{ x: RequiredTrait<number>; y: number }> = {
      x: { required: true, enumerable: true, _type: null!, value: null },
      y: { _type: null!, value: 1, enumerable: true, configurable: true, writable: true },
    };

    const t2: Trait<{ x: number; y: number; z: boolean }> = {
      x: { _type: null!, value: 2, enumerable: true, configurable: true, writable: true },
      y: { _type: null!, value: 99, enumerable: false, configurable: true, writable: true },
      z: { _type: null!, value: true, enumerable: true, configurable: true, writable: true },
    };

    const t3: Trait<{ y: RequiredTrait<number>; w: string }> = {
      y: { required: true, enumerable: true, _type: null!, value: null },
      w: { _type: null!, value: "end", enumerable: true, configurable: true, writable: true },
    };

    // Step by step:
    //   override(t1, t2):
    //     - t1.x is required => replaced by t2.x => x=2
    //     - t1.y is normal => keep it => y=1
    //     - t2 has z => new => z=true
    //   result => { x=2, y=1, z=true }
    //
    //   override({...}, t3):
    //     - left has y=1 (normal), right has y=required =>
    //       left is normal => keep left => y=1
    //     - new property w => "end"
    //   final => { x=2, y=1, z=true, w="end" }

    const merged: any = override(t1, t2, t3);
    expect(Object.keys(merged)).toEqual(["x", "y", "z", "w"]);

    // x from t2
    expect(merged.x.value).toBe(2);

    // y from t1
    expect(merged.y.value).toBe(1);

    // z from t2
    expect(merged.z.value).toBe(true);

    // w from t3
    expect(merged.w.value).toBe("end");
  });

  it("returns an empty trait if no arguments are provided", () => {
    const result = override();
    expect(Object.keys(result).length).toBe(0);
  });

  it("freezes the merged trait", () => {
    const t1: Trait<{ a: number }> = {
      a: { _type: null!, value: 1, enumerable: true, configurable: true, writable: true },
    };
    const merged = override(t1);
    expect(Object.isFrozen(merged)).toBe(true);
  });
});
