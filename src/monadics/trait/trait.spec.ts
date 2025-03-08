import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { MethodPropertyDescriptor, PropertyDescriptorBase, RequiredPropertyDescriptor } from "./property-descriptors";
import { required, RequiredTrait } from "./required";
import { InferTrait, Trait, trait } from "./trait";

describe("trait() function", () => {
  describe("Basic property descriptors", () => {
    it("creates a standard property descriptor from a numeric property", () => {
      // Explanation: Ensures a numeric property is mapped to a writable/enumerable descriptor.
      const t = trait({ a: 1 });
      type TraitActual = typeof t;
      type TraitExpect = { a: PropertyDescriptorBase<number> };
      AssertTrue<Equals<TraitActual, TraitExpect>>();
      expect(t).toEqual({
        a: {
          configurable: true,
          enumerable: true,
          writable: true,
          value: 1,
        },
      });
    });
  });

  describe("Required property descriptors", () => {
    it("creates a required property descriptor from a required<T>() property", () => {
      // Explanation: Verifies that passing required<T>() yields a property descriptor with required:true.
      const t = trait({ a: required<number>() });
      type TraitActual = typeof t;
      type TraitExpect = { a: RequiredPropertyDescriptor<number> };
      AssertTrue<Equals<TraitActual, TraitExpect>>();
      expect(t).toEqual({
        a: {
          _type: null,
          enumerable: false,
          required: true,
          value: undefined,
        },
      });
    });
  });

  describe("Method property descriptors", () => {
    it("creates a method property descriptor from a function property", () => {
      // Explanation: Checks that function properties are recognized and converted into method descriptors.
      const t = trait({
        bar: 0,
        getBar(): number {
          return this.bar;
        },
      });
      type TraitActual = typeof t;
      type TraitExpect = {
        getBar: MethodPropertyDescriptor<() => number>;
        bar: PropertyDescriptorBase<number>;
      };
      AssertTrue<Equals<TraitActual, TraitExpect>>();
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
        },
      });
    });
  });

  describe("Getter/Setter property descriptors", () => {
    it("creates property descriptors for a getter and setter pair", () => {
      // Explanation: Confirms that get/set properties are mapped to a descriptor with get and set functions.
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
      type TraitExpect = {
        bar: PropertyDescriptorBase<number>;
        _bar: PropertyDescriptorBase<number>;
      };
      AssertTrue<Equals<TraitActual, TraitExpect>>();
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
  });
});

describe("Edge Cases", () => {
  it("ignores symbol-based properties", () => {
    // Explanation: Checks that properties defined by symbols are not included in the resulting trait descriptors.
    const sym = Symbol("mySymbol");
    const input = {
      normal: 123,
      [sym]: "hidden",
    };
    const t = trait(input);
    // Symbol-based properties won't appear because we use Object.getOwnPropertyNames()
    expect(t).toEqual({
      normal: {
        configurable: true,
        enumerable: true,
        writable: true,
        value: 123,
      },
    });
  });

  it("freezes prototypes of get/set functions", () => {
    // Explanation: Confirms that the get and set function prototypes are frozen by trait().
    const t = trait({
      _foo: 1,
      get foo() {
        return this._foo;
      },
      set foo(val: number) {
        this._foo = val;
      },
    });

    // Check that get's prototype is frozen
    expect(Object.isFrozen(t.foo.get?.prototype)).toBe(true);
    // Check that set's prototype is frozen
    expect(Object.isFrozen(t.foo.set?.prototype)).toBe(true);
  });
});
describe("Advanced Type Inference", () => {
  it("preserves type equivalence with nested Trait references", () => {
    // Explanation: Confirms that nested Trait references result in the same top-level inferred type.
    type Actual = Trait<{
      foo: () => number;
      bar: RequiredTrait<number>;
      baz: number;
    }>;

    // Create an Expected type that essentially re-wraps Actual in Trait<inferT<...>> to see if it remains identical.
    type Expected = Trait<InferTrait<Trait<InferTrait<Actual>>>>;

    // Asserts that Actual and Expected are the same type.
    AssertTrue<Equals<Actual, Expected>>();
  });
  // it("preserves type equivalence with nested RequiredTrait references", () => {
  //   const Gen = {
  //     y: "2" as const,
  //     x<A>() {
  //       return [null! as A, this] as const;
  //     },
  //   };
  //   const gen: Magic<typeof Gen> = null!;

  //   trait({
  //     req: required<number>(),
  //     x<A>(): A {
  //       const f = this.x();
  //       const self = this;
  //       AssertTrue<Equals<typeof this, Magic<{ req: RequiredTrait<number>; x: <A>() => A }>>>();
  //       // this.req.key;
  //       return null!;
  //     },
  //   });
  //   type X = RequiredThis<{
  //     x: <A>() => A;
  //   }>;

  //   AssertTrue<Equals<Actual, Expected>>();
  // });
});
