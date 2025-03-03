import { describe, expect, it } from "vitest";
import { exeption } from "../toError";
import { Merge, Trait } from "./traits";

describe("traits", () => {
  describe("Basic Creation", () => {
    it("creates a trait with a default object", () => {
      // Explanation: Verifies that creating a trait with default values returns the expected object.
      const trait = Trait.identity(() => ({ a: "hello" })).build(() => ({}));
      expect(trait).toMatchObject({ a: "hello" });
    });

    it("provides additional context to a trait", () => {
      // Explanation: Checks that the 'provide' method correctly supplies extra data to the trait.
      const trait = Trait.identity(() => ({ a: "hello" })).build(() => ({}));
      expect(trait).toMatchObject({ a: "hello" });
    });

    it("creates an empty trait successfully", () => {
      // Explanation: Ensures an empty trait definition can be created and remains functional.
      const received = Trait.empty();
      expect(received.req).toMatchObject({});
      expect(received.create({})).toMatchObject({});
    });

    it("handles creation of a trait without requirements", () => {
      // Explanation: Confirms that creating traits with no required fields still produces the expected object.
      const received = Trait.identity(() => ({ a: "hello" })).build(() => ({}));
      expect(received).toMatchObject({ a: "hello" });
    });

    it("enforces required fields for trait creation", () => {
      // Explanation: Demonstrates that a required field (e.g., string) must be provided for the trait to build properly.
      const requiredString = Trait.required<string>((t) =>
        typeof t !== "string"
          ? exeption(() => {
              throw new Error("A string was required");
            })
          : t
      );
      const trait = new Trait({ a: requiredString }, () => ({}));
      expect(trait.build(() => ({ a: "hello" }))).toMatchObject({
        a: "hello",
      });
    });

    it("requires mandatory fields to be provided for trait creation", () => {
      // Explanation: Similar to the above, ensures that the build process fails (or errors) if required fields are missing.
      const stringTrait = new Trait({ a: Trait.required<string>() }, () => ({}));
      const valid = stringTrait.build(() => ({ a: "hello" }));
      expect(valid).toMatchObject({ a: "hello" });

      // @ts-expect-error – This line ensures a TypeScript error if 'a' is not provided
      expect(() => Trait.build(stringTrait, () => ({}))).toThrow();
    });
  });

  describe("Trait Creation Logic", () => {
    it("creates an object with the correct properties using createTrait()", () => {
      // Explanation: Verifies that calling createTrait() returns an object containing the specified properties.
      const traitA = Trait.identity(() => ({ a: "hello" })).build(() => ({}));
      expect(traitA).toMatchObject({ a: "hello" });
    });

    it("supports custom methods defined in createTrait()", () => {
      // Explanation: Checks that traits can include custom methods which operate on the trait’s own data.
      const traitA = Trait.identity(() => ({
        a: "hello",
        append() {
          this.a += " world";
        },
      })).build(() => ({}));
      expect(traitA).toMatchObject({
        a: "hello",
        append: expect.any(Function),
      });
    });

    it("allows created objects to mutate their properties", () => {
      // Explanation: Ensures that methods on the created trait object can modify the trait’s internal state.
      const traitA = Trait.identity(() => ({
        a: "hello",
        append() {
          this.a += " world";
        },
      })).create({});
      expect(traitA).toMatchObject({
        a: "hello",
        append: expect.any(Function),
      });
      traitA.append();
      expect(traitA).toMatchObject({
        a: "hello world",
        append: expect.any(Function),
      });
    });
  });

  describe("Trait Concatenation", () => {
    it("concatenates two traits together", () => {
      // Explanation: Verifies that two simple traits can be merged into one object with combined properties.
      const traitdef = Trait.concat(
        Trait.identity(() => ({ a: "hello" })),
        Trait.identity(() => ({ b: "world" }))
      );
      expect(traitdef.req).toMatchObject({});
      const trait = traitdef.build(() => ({}));
      expect(trait).toMatchObject({ a: "hello", b: "world" });
    });

    it("merges multiple traits using concat", () => {
      // Explanation: Shows that multiple traits can be merged and produce a single composite object.
      const traitA = Trait.identity(() => ({ a: "hello" }));
      const traitB = Trait.identity(() => ({ b: "hello" }));

      const traitC = traitA.concat(traitB);
      expect(traitC.build(() => ({}))).toMatchObject({ a: "hello", b: "hello" });
    });

    it("allows each trait to mutate its own property after concatenation", () => {
      // Explanation: Ensures that methods defined in one trait do not interfere with properties in another trait.
      const traitA = Trait.identity(() => ({
        a: "hello",
        appanedA() {
          this.a += " world";
        },
      }));
      const traitB = Trait.identity(() => ({ b: "hello" }));
      const traitC = traitA.concat(traitB).build(() => ({}));
      expect(traitC).toMatchObject({ a: "hello", b: "hello" });
      traitC.appanedA();
      expect(traitC).toMatchObject({ a: "hello world", b: "hello" });
    });

    it("allows one trait to mutate another trait's property after concatenation", () => {
      // Explanation: Demonstrates that a method in one trait can safely mutate a property defined in another trait.
      const traitA = Trait.identity(() => ({
        a: "hello",
        appanedA() {
          this.a += " world";
        },
      }));
      const traitB = new Trait({ a: Trait.required<string>() }, (self) => ({
        b: "hello",
        appendATwice() {
          self.a += " world";
          self.a += " world";
        },
      }));
      expect(traitB.build(() => ({ a: "hello" })).a).toBe("hello");
      expect(() => traitB.build(() => ({} as any)).a).toThrow();

      const concat = traitA.concat(traitB).build(() => ({}));
      expect(concat).toMatchObject({ a: "hello", b: "hello" });
      concat.appendATwice();
      expect(concat).toMatchObject({ a: "hello world world", b: "hello" });
    });
  });

  describe("Trait Mutation & State", () => {
    it("enables direct mutation on required array properties", () => {
      // Explanation: Checks that arrays in required fields can be manipulated with trait methods.
      const requiredStringArray = Trait.required<string[]>((t) =>
        Array.isArray(t) && t.every((item) => typeof item !== "string")
          ? exeption(() => {
              throw new Error("A string array was required");
            })
          : (t as string[])
      );
      const traitDef = new Trait({ a: requiredStringArray }, (self) => ({
        push: (item: string) => {
          self.a.push(item);
        },
      }));
      const trait = traitDef.build(() => ({ a: ["hello"] }));
      trait.push("world");
      expect(trait).toMatchObject({ a: ["hello", "world"] });

      // Provide + build example
      const trait3 = Trait.provide(traitDef, () => ({ a: ["hello"] })).build(() => ({}));
      trait3.push("world");
      expect(trait3).toMatchObject({ a: ["hello", "world"] });
    });

    it("preserves separate state across multiple trait instances", () => {
      // Explanation: Verifies that independent builds of the same trait definition do not share state.
      const requiredStringArray = Trait.required<string[]>((t) =>
        Array.isArray(t) && t.every((item) => typeof item !== "string")
          ? exeption(() => {
              throw new Error("A string array was required");
            })
          : (t as string[])
      );
      const traitDef = new Trait({ items: requiredStringArray }, (self) => ({
        push: (item: string) => {
          self.items.push(item);
        },
      }));
      const trait1 = traitDef.build(() => ({ items: ["hello"] }));
      const trait2 = traitDef.build(() => ({ items: ["hello"] }));
      trait1.push("world");
      expect(trait1).toMatchObject({ items: ["hello", "world"] });
      trait2.push("world2");
      expect(trait2).toMatchObject({ items: ["hello", "world2"] });

      // Branching example
      const trait3 = traitDef.provide(() => ({ items: ["world"] }));
      const trait4 = trait3.build(() => ({}));
      const trait5 = trait3.build(() => ({}));
      trait4.push("world");
      expect(trait5).toMatchObject({ items: ["world"] });
      trait5.push("world");
      expect(trait4).toMatchObject({ items: ["world", "world"] });
      expect(trait5).toMatchObject({ items: ["world", "world"] });

      // Combine push/pop
      const trait6 = trait3
        .concat(
          new Trait({ items: requiredStringArray }, (self) => ({
            pop: () => {
              self.items.pop();
            },
          }))
        )
        .build(() => ({}));
      trait6.push("world");
      expect(trait6).toMatchObject({ items: ["world", "world"] });
      trait6.pop();
      trait6.pop();
      expect(trait6).toMatchObject({ items: [] });
    });
  });

  describe("Edge Cases", () => {
    it("fails when providing incompatible types for a required field", () => {
      // Explanation: We intentionally provide a number instead of a string, expecting an error.
      const stringRequired = Trait.required<string>((val) =>
        typeof val !== "string"
          ? exeption(() => {
              throw new Error("Not a string!");
            })
          : val
      );
      const trait = new Trait({ name: stringRequired }, (self) => ({
        printName: () => self.name.toUpperCase(),
      }));

      // This should throw at build-time or print an error because we're passing a number.
      expect(() => trait.build(() => ({ name: 42 as any }))).toThrowError("Not a string!");
    });

    it("throws if required field is missing altogether", () => {
      // Explanation: We purposely omit the 'id' field to see if it breaks or is caught by TS or at runtime.
      const idRequired = Trait.required<number>((val) =>
        typeof val !== "number"
          ? exeption(() => {
              throw new Error("Number required");
            })
          : val
      );
      const trait = new Trait({ id: idRequired }, (self) => ({
        getId: () => self.id,
      }));

      // Should throw an error (either at compile time or runtime).
      expect(() => trait.build(() => ({} as any))).toThrowError("Missing required key: id");
    });

    it("overwrites shared properties across multiple concat calls", () => {
      // Explanation: We define one trait property (foo), then define another trait with the same property name but different usage.
      const traitA = Trait.identity(() => ({
        foo: "initial foo",
      }));
      const traitB = Trait.identity(() => ({
        foo: "secondary foo",
      }));
      const combined = Trait.concat(traitA, traitB);

      // We expect the final build to reflect traitB’s value for 'foo' if the merge overwrote traitA’s property.
      expect(combined.build(() => ({}))).toMatchObject({ foo: "secondary foo" });
    });

    it("creates cyclical references that might break merges", () => {
      // Explanation: We attempt to create a trait which references itself in a cyclical manner,
      // potentially tripping up 'Object.getOwnPropertyNames' or merges.
      const cyclicalTrait = new Trait({}, (self) => {
        (self as any).cycle = self;
        return {
          checkCycle: () => {
            return (self as any).cycle === self;
          },
        };
      });

      const built = cyclicalTrait.build(() => ({}));
      expect(built.checkCycle()).toBe(true);
    });

    it("prevents unintended method overwrites when merging traits with the same method name", () => {
      // Explanation: Both traits define a method named 'doSomething'. We want to see which trait’s method wins.
      const traitA = new Trait({}, () => ({
        doSomething() {
          return "A";
        },
      }));
      const traitB = new Trait({}, () => ({
        doSomething() {
          return "B";
        },
      }));
      const merged = Trait.concat(traitA, traitB).build(() => ({}));

      // Because of the last-in merge strategy, we expect "B".
      expect(merged.doSomething()).toBe("B");
    });

    it("handles weird or non-standard property definitions", () => {
      // Explanation: We define a non-enumerable property, which might or might not get merged by Trait.merge.
      const traitA = new Trait({}, () => {
        const obj: any = {};
        Object.defineProperty(obj, "secret", {
          enumerable: false,
          writable: true,
          configurable: true,
          value: 123,
        });
        return obj;
      });

      // If Trait.merge uses Object.getOwnPropertyNames, the 'secret' property might appear and get copied.
      const built = traitA.build(() => ({}));
      expect(Object.prototype.hasOwnProperty.call(built, "secret")).toBe(true);
      expect(built.secret).toBe(123);
    });

    it("propagates errors when a provided parser function always throws", () => {
      // Explanation: The required field has a parser that always throws, no matter what you pass in.
      // We'll see if that properly short-circuits.
      const alwaysError = Trait.required<string>(() => {
        throw new Error("Parser always fails");
      });

      const traitWithAlwaysError = new Trait({ text: alwaysError }, () => ({}));
      expect(() => traitWithAlwaysError.build(() => ({ text: "No matter what you pass" }))).toThrowError(
        "Parser always fails"
      );
    });
  });

  describe("Trait Composition", () => {
    it("merges multiple traits into a single composite object", () => {
      // Explanation: Demonstrates that traitA and traitB can be composed (concatenated) into one object.
      const traitA = Trait.identity(() => ({ a: "hello" }));
      const traitB = Trait.identity(() => ({ b: "world" }));
      const traitF = traitA.concat(traitB);
      expect(traitF.build(() => ({}))).toMatchObject({ a: "hello", b: "world" });
    });

    it("creates a new trait with numeric injection", () => {
      // Explanation: Shows how a required numeric field can be built and then mutated by custom methods.
      const requiredNumber = Trait.required<number>((val) =>
        typeof val !== "number"
          ? exeption(() => {
              throw new Error("Not a number!");
            })
          : val
      );
      const traitA = new Trait({ item: requiredNumber }, (self) => ({
        inject(num: number) {
          self.item = num;
          return self;
        },
      })).build(() => ({ item: 1 }));

      expect(traitA.inject(5).item).toBe(5);
    });

    it("demonstrates advanced numeric operations using composition", () => {
      // Explanation: Exercises multiple methods on a numeric trait, including exponentiation, clearing, etc.
      const requiredNumber = Trait.required<number>((val) =>
        typeof val !== "number"
          ? exeption(() => {
              throw new Error("Not a number!");
            })
          : val
      );
      const traitA = new Trait({ item: requiredNumber }, (self) => {
        const inner = {
          inject(num: number) {
            self.item = num;
            return self as Merge<typeof self, typeof inner>;
          },
          exponent(num: number) {
            self.item = self.item ** num;
            return self as Merge<typeof self, typeof inner>;
          },
          retr() {
            const ret = self.item;
            inner.clear();
            return ret;
          },
          clear() {
            self.item = 0;
            return self as Merge<typeof self, typeof inner>;
          },
        };
        return inner;
      }).build(() => ({ item: 1 }));

      // Checking exponent logic
      expect(traitA.inject(5).exponent(5).retr()).toBe(3125);
      expect(traitA.inject(10).exponent(5).retr()).toBe(100000);

      // Clearing logic
      expect(traitA.inject(2).clear()).toMatchObject({ item: 0 });

      // Combination logic
      expect(traitA.inject(5).exponent(5).inject(2).retr()).toBe(2);
    });
  });
});

describe("Torture Tests: Trying to break Trait functionality", () => {
  it("creates a conflicting required field with two contradictory parsers", () => {
    // Explanation: Merges two traits requiring the same field with different, incompatible validations.
    // If your code doesn’t gracefully handle that conflict, it might throw or produce incorrect results.
    const mustBeString = Trait.required<string>((val) =>
      typeof val !== "string"
        ? exeption(() => {
            throw new Error("Not a string");
          })
        : val
    );
    const mustBeNumber = Trait.required<number>((val) =>
      typeof val !== "number"
        ? exeption(() => {
            throw new Error("Not a number");
          })
        : val
    );

    const traitString = new Trait({ shared: mustBeString }, (self) => ({
      getAsString: () => self.shared,
    }));
    const traitNumber = new Trait({ shared: mustBeNumber }, (self) => ({
      getAsNumber: () => self.shared,
    }));

    const combined = traitString.concat(traitNumber);
    expect(() => combined.build(() => ({ shared: "this is a string" } as any))).toThrowError("Not a number");

    expect(() => combined.build(() => ({ shared: 42 } as any))).toThrowError("Not a string");
  });

  it("creates traits with nested cyclical references that might cause infinite merge loops", () => {
    // Explanation: Each trait references the other, forming a cycle more than one level deep.
    // If merge logic or property copying isn’t robust, it might get stuck.
    const traitA = new Trait({}, (self) => {
      (self as any).referenceB = {};
      return {
        setRefB(b: any) {
          (self as any).referenceB = b;
        },
      };
    });

    const traitB = new Trait({}, (self) => {
      (self as any).referenceA = {};
      return {
        setRefA(a: any) {
          (self as any).referenceA = a;
        },
      };
    });

    // Merge them
    const merged = traitA.concat(traitB).build(() => ({}));
    // Introduce cyclical references
    merged.setRefA(merged);
    merged.setRefB(merged);

    // If your code tries to re-merge or re-copy properties now, it could get stuck in infinite recursion.
    expect(merged).toBeDefined(); // Not a strict check, just ensuring no crash so far.
  });

  it("overwrites built-in methods like toString()", () => {
    // Explanation: Some libraries rely on special keys (like `toString`). If your merge logic copies them incorrectly,
    // or you rely on them being unmodified, it may cause weird errors.
    const traitA = new Trait({}, () => ({
      toString() {
        return "TraitA’s custom toString";
      },
    }));
    const traitB = new Trait({}, () => ({
      toString() {
        return "TraitB’s custom toString";
      },
    }));

    // Because of the last-in merge strategy, traitB’s toString might overwrite traitA’s.
    const merged = traitA.concat(traitB).build(() => ({}));

    expect(merged.toString()).toBe("TraitB’s custom toString");
  });

  it("attempts building the same trait multiple times with stateful changes in between builds", () => {
    // Explanation: If trait creation is meant to be 'pure', building multiple times with different data
    // shouldn’t cause state to leak between builds.
    const traitCountArray = new Trait(
      {
        values: Trait.required<number[]>((val) =>
          !Array.isArray(val)
            ? exeption(() => {
                throw new Error("Number[] required");
              })
            : val
        ),
      },
      (self) => ({
        pushAndSum(num: number) {
          self.values.push(num);
          return self.values.reduce((acc, val) => acc + val, 0);
        },
      })
    );

    const build1 = traitCountArray.build(() => ({ values: [1, 2] }));
    expect(build1.pushAndSum(3)).toBe(6); // Now array is [1,2,3], sum = 6

    const build2 = traitCountArray.build(() => ({ values: [10, 20] }));
    // If there's any leak from build1, the array might incorrectly contain [1,2,3].
    // We expect it to be fresh: [10,20] + 5 => 35
    expect(build2.pushAndSum(5)).toBe(35);
    expect(build1).not.toMatchObject(build2);

    // Build again using the 'provide' approach
    const traitProvided = traitCountArray.provide(() => ({ values: [100] })).build(() => ({}));
    expect(traitProvided.pushAndSum(50)).toBe(150);
    // Ensure no leak from build2 or build1
    expect(build1.values).toEqual([1, 2, 3]);
    expect(build2.values).toEqual([10, 20, 5]);
    expect(traitProvided.values).toEqual([100, 50]);
  });

  it("defines a trait whose createTrait function returns a non-object value", () => {
    // Explanation: Typically, trait definitions return objects. But what if a trait returns a primitive?
    // This might break the merging logic or produce unexpected results.
    const returnNumber = new Trait({}, () => 123 as any);
    // If your merge logic expects an object, this might cause problems or skip copying anything.
    // We just ensure it doesn't crash.
    expect(() => returnNumber.build(() => ({}))).toThrow();
  });

  it("tries to create a trait that mutates the provided context in the constructor itself", () => {
    // Explanation: Normally, we expect mutation via methods. If the trait code mutates
    // the context in the creation function, it might lead to confusing states.
    const traitSelfMutate = new Trait({}, (self) => {
      (self as any).initialized = false;
      return {
        checkInitialized: () => {
          if ((self as any).initialized) {
            return "abc";
          }
          (self as any).initialized = true;

          return (self as any).initialized;
        },
      };
    });
    const built = traitSelfMutate.build(() => ({}));
    // If it merges properly, we should see the “initialized” property:
    expect(built.checkInitialized()).toBe(true);
    expect(built.checkInitialized()).toBe("abc");
    expect(traitSelfMutate.build(() => ({})).checkInitialized()).toBe(true);
  });
});
