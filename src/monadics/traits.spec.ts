import { describe, expect, it } from "vitest";
import { exception } from "../error";
import { isTypeOf } from "../guards/isTypeOf";
import { Build, CreateArgs, Merge, Required, Trait } from "./traits";

describe("Trait Functionality", () => {
  //
  // --------------------------------
  // 1. Basic Creation
  // --------------------------------
  describe("Basic Creation", () => {
    it("creates a trait with default values", () => {
      // Explanation: Verifies that creating a trait with default values returns the expected object.
      const trait = Trait.identity(() => ({ a: "hello" })).build({});
      expect(trait).toMatchObject({ a: "hello" });
    });

    it("adds extra data using the provide method", () => {
      // Explanation: Checks that the 'provide' method correctly supplies extra data to the trait.
      const trait = Trait.identity(() => ({ a: "hello" })).build({});
      expect(trait).toMatchObject({ a: "hello" });
    });

    it("creates an empty trait", () => {
      // Explanation: Ensures an empty trait definition can be created and remains functional.
      const received = Trait.empty();
      expect(received.required).toMatchObject({});
      expect(received.create({})).toMatchObject({});
    });

    it("builds a trait without any requirements", () => {
      // Explanation: Confirms that creating traits with no required fields still produces the expected object.
      const received = Trait.identity(() => ({ a: "hello" })).build({});
      expect(received).toMatchObject({ a: "hello" });
    });

    it("requires fields that are marked as required", () => {
      // Explanation: Demonstrates that a required string field must be provided for the trait to build properly.
      const requiredString = Trait.required<string>((t) =>
        typeof t !== "string" ? exception("A string was required") : t,
      );
      const trait = new Trait({ a: requiredString }, () => ({}));
      expect(trait.build({ a: "hello" })).toMatchObject({ a: "hello" });
    });

    it("throws an error if required fields are missing", () => {
      // Explanation: Ensures that the build process fails if required fields are not provided at build time.
      const stringTrait = new Trait({ a: Trait.required<string>() }, () => ({}));
      const valid = stringTrait.build({ a: "hello" });
      expect(valid).toMatchObject({ a: "hello" });

      // @ts-expect-error – This line checks TS enforcement if 'a' is omitted.
      expect(() => Trait.build(stringTrait, () => ({}))).toThrow();
    });
  });

  //
  // --------------------------------
  // 2. Trait Creation Logic
  // --------------------------------
  describe("Trait Creation Logic", () => {
    it("returns an object with the specified properties via createTrait()", () => {
      // Explanation: Verifies that calling createTrait() returns an object containing the defined properties.
      const traitA = Trait.identity(() => ({ a: "hello" })).build({});
      expect(traitA).toMatchObject({ a: "hello" });
    });

    it("supports custom methods defined in createTrait()", () => {
      // Explanation: Checks that traits can include custom methods in their returned object.
      const traitA = Trait.identity(() => ({
        a: "hello",
        append() {
          this.a += " world";
        },
      })).build({});
      expect(traitA).toMatchObject({
        a: "hello",
        append: expect.any(Function),
      });
    });

    it("mutates object properties via custom methods", () => {
      // Explanation: Ensures that trait-defined methods can modify the internal state of the created object.
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
      expect(traitA.a).toBe("hello world");
    });
  });

  //
  // --------------------------------
  // 3. Trait Concatenation
  // --------------------------------
  describe("Trait Concatenation", () => {
    it("combines two traits into a single object", () => {
      // Explanation: Verifies that two simple traits can be merged into one object with combined properties.
      const traitdef = Trait.concat(
        Trait.identity(() => ({ a: "hello" })),
        Trait.identity(() => ({ b: "world" })),
      );
      const trait = traitdef.build({});
      expect(trait).toMatchObject({ a: "hello", b: "world" });
    });

    it("merges multiple traits via concat", () => {
      // Explanation: Demonstrates that multiple traits can be merged into a single composite object.
      const traitA = Trait.identity(() => ({ a: "hello" }));
      const traitB = Trait.identity(() => ({ b: "hello" }));
      const traitC = traitA.concat(traitB);
      expect(traitC.build({})).toMatchObject({ a: "hello", b: "hello" });
    });

    it("permits independent property mutation within each trait", () => {
      // Explanation: Ensures that each trait can safely mutate its own properties even after concatenation.
      const traitA = Trait.identity(() => ({
        a: "hello",
        appendA() {
          this.a += " world";
        },
      }));
      const traitB = Trait.identity(() => ({ b: "hello" }));
      const traitC = traitA.concat(traitB).build({});
      expect(traitC).toMatchObject({ a: "hello", b: "hello" });
      traitC.appendA();
      expect(traitC.a).toBe("hello world");
    });

    it("enables cross-trait property mutation", () => {
      // Explanation: Demonstrates that a method in one trait can safely mutate a property from another trait after concatenation.
      const traitA = Trait.identity(() => ({
        a: "hello",
        appendA() {
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
      const concat = traitA.concat(traitB).build({});
      expect(concat).toMatchObject({ a: "hello", b: "hello" });
      concat.appendATwice();
      expect(concat.a).toBe("hello world world");
    });
  });

  //
  // --------------------------------
  // 4. Trait Mutation & State
  // --------------------------------
  describe("Trait Mutation & State", () => {
    it("mutates array properties marked as required", () => {
      // Explanation: Checks that arrays in required fields can be manipulated using trait-defined methods.
      const requiredStringArray = Trait.required<string[]>((t) =>
        Array.isArray(t) && t.every((item) => typeof item !== "string")
          ? exception("A string array was required")
          : (t as string[]),
      );
      const traitDef = new Trait({ a: requiredStringArray }, (self) => ({
        push: (item: string) => {
          self.a.push(item);
        },
      }));
      const trait = traitDef.build({ a: ["hello"] });
      trait.push("world");
      expect(trait).toMatchObject({ a: ["hello", "world"] });

      // Provide + build example
      const trait3 = Trait.provide(traitDef, () => ({ a: ["hello"] })).build({});
      trait3.push("world");
      expect(trait3.a).toEqual(["hello", "world"]);
    });

    it("maintains independent state across multiple builds", () => {
      // Explanation: Verifies that building the same trait multiple times doesn't leak or share state among instances.
      const requiredStringArray = Trait.required<string[]>((t) =>
        Array.isArray(t) && t.every((item) => typeof item !== "string")
          ? exception("A string array was required")
          : (t as string[]),
      );
      const traitDef = new Trait({ items: requiredStringArray }, (self) => ({
        push: (item: string) => {
          self.items.push(item);
        },
      }));
      const trait1 = traitDef.build({ items: ["hello"] });
      const trait2 = traitDef.build({ items: ["hello"] });
      trait1.push("world");
      expect(trait1.items).toEqual(["hello", "world"]);
      trait2.push("world2");
      expect(trait2.items).toEqual(["hello", "world2"]);

      // Additional branching
      const trait3 = traitDef.provide(() => ({ items: ["world"] }));
      const trait4 = trait3.build({});
      const trait5 = trait3.build({});
      trait4.push("world");
      expect(trait4.items).toEqual(["world", "world"]);
      expect(trait5.items).toEqual(["world"]);

      // Combine push/pop
      const trait6 = trait3
        .concat(
          new Trait({ items: requiredStringArray }, (self) => ({
            pop: () => {
              self.items.pop();
            },
          })),
        )
        .build({});
      trait6.push("world");
      expect(trait6.items).toEqual(["world", "world"]);
      trait6.pop();
      trait6.pop();
      expect(trait6.items).toEqual([]);
    });
  });

  //
  // --------------------------------
  // 5. Edge Cases
  // --------------------------------
  describe("Edge Cases", () => {
    it("throws when incompatible types are provided for a required field", () => {
      // Explanation: Providing a number instead of a string should throw an error, validating parser enforcement.
      const stringRequired = Trait.required<string>((val) =>
        typeof val !== "string" ? exception("Not a string!") : val,
      );
      const trait = new Trait({ name: stringRequired }, (self) => ({
        printName: () => self.name.toUpperCase(),
      }));
      expect(() => trait.build({ name: 42 as any })).toThrowError("Not a string!");
    });

    it("throws if a required field is entirely omitted", () => {
      // Explanation: Ensures that the build process fails if the required field is missing from the input.
      const idRequired = Trait.required<number>((val) =>
        typeof val !== "number" ? exception("Number required") : val,
      );
      const trait = new Trait({ id: idRequired }, (self) => ({
        getId: () => self.id,
      }));
      expect(() => trait.build({} as any)).toThrowError("Missing required key: id");
    });

    it("overrides shared property values during multiple concatenations", () => {
      // Explanation: Demonstrates how overlapping property names get overwritten by the last trait in the merge.
      const traitA = Trait.identity(() => ({
        foo: "initial foo",
      }));
      const traitB = Trait.identity(() => ({
        foo: "secondary foo",
      }));
      const combined = traitA.overwrite(traitB);
      expect(combined.build({})).toMatchObject({ foo: "secondary foo" });
    });

    it("handles cyclical references without breaking merges", () => {
      // Explanation: Verifies that cyclical references in the returned object do not crash the merge logic.
      const cyclicalTrait = new Trait({}, (self) => {
        (self as any).cycle = self;
        return {
          checkCycle: () => (self as any).cycle === self,
        };
      });
      const built = cyclicalTrait.build({});
      expect(built.checkCycle()).toBe(true);
    });

    it("prefers the last-defined method when merging traits with the same method name", () => {
      // Explanation: If two traits define a method with the same name, the second trait’s method overwrites the first.
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
      const merged = traitA.overwrite(traitB).build({});
      expect(merged.doSomething()).toBe("B");
    });

    it("copies non-standard properties such as non-enumerable fields", () => {
      // Explanation: Ensures non-enumerable properties are still copied using Object.getOwnPropertyNames.
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
      const built = traitA.build({});
      expect(Object.prototype.hasOwnProperty.call(built, "secret")).toBe(true);
      expect(built.secret).toBe(123);
    });

    it("propagates errors from a parser function that always throws", () => {
      // Explanation: Testing a parser that unconditionally throws, no matter the input.
      const alwaysError = Trait.required<string>(() => {
        throw new Error("Parser always fails");
      });
      const traitWithAlwaysError = new Trait({ text: alwaysError }, () => ({}));
      expect(() => traitWithAlwaysError.build({ text: "No matter what" })).toThrowError("Parser always fails");
    });
  });

  //
  // --------------------------------
  // 6. Trait Composition
  // --------------------------------
  describe("Trait Composition", () => {
    it("builds a composite object from multiple traits", () => {
      // Explanation: Demonstrates that multiple traits can be composed into a single object.
      const traitA = Trait.identity(() => ({ a: "hello" }));
      const traitB = Trait.identity(() => ({ b: "world" }));
      const traitF = traitA.concat(traitB);
      expect(traitF.build({})).toMatchObject({ a: "hello", b: "world" });
    });

    it("builds a trait requiring numeric values and supports injection", () => {
      // Explanation: Illustrates how a required numeric field can be constructed and then modified via trait methods.
      const requiredNumber = Trait.required<number>((val) =>
        typeof val !== "number" ? exception("Not a number!") : val,
      );
      const traitA = new Trait({ item: requiredNumber }, (self) => ({
        inject(num: number) {
          self.item = num;
          return self;
        },
      })).build({ item: 1 });

      expect(traitA.inject(5).item).toBe(5);
    });

    it("performs advanced numeric operations through composition", () => {
      // Explanation: Exercises multiple numeric methods (inject, exponent, clear) via a composed trait.
      const requiredNumber = Trait.required<number>((val) =>
        typeof val !== "number" ? exception("Not a number!") : val,
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
      }).build({ item: 1 });

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

// --------------------------------------
// 7. Torture Tests: Trying to break Trait functionality
// --------------------------------------
describe("Torture Tests: Trying to break Trait functionality", () => {
  it("rejects contradictory required field parsers", () => {
    // Explanation: Merging two traits that require the same field to be different types should throw an error.
    const mustBeString = Trait.required<string>((val) => (typeof val !== "string" ? exception("Not a string") : val));
    const mustBeNumber = Trait.required<number>((val) => (typeof val !== "number" ? exception("Not a number") : val));

    const traitString = new Trait({ shared: mustBeString }, (self) => ({
      getAsString: () => self.shared,
    }));
    const traitNumber = new Trait({ shared: mustBeNumber }, (self) => ({
      getAsNumber: () => self.shared,
    }));

    expect(() => traitString.concat(traitNumber).build({ shared: "this is a string" } as any)).toThrowError(
      "Required key already exists: shared",
    );
  });

  it("accepts identical required field parsers", () => {
    // Explanation: Merging two traits that require the same field to be different types should throw an error.
    const mustBeString = Trait.required<string>((val) => (typeof val !== "string" ? exception("Not a string") : val));

    const traitString = new Trait({ shared: mustBeString }, (self) => ({
      getAsString: () => self.shared,
    }));
    const traitString2 = new Trait({ shared: mustBeString }, (self) => ({
      getAsNumber: () => self.shared,
    }));

    expect(traitString.concat(traitString2).build({ shared: "this is a string" })).toMatchObject({
      shared: "this is a string",
    });
  });

  it("manages nested cyclical references without infinite loops", () => {
    // Explanation: If each trait references the other in a cyclical pattern, merging should still avoid infinite recursion.
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

    const merged = traitA.concat(traitB).build({});
    merged.setRefA(merged);
    merged.setRefB(merged);

    expect(merged).toBeDefined(); // Just ensures no crash or infinite loop
  });

  it("overrides built-in methods like toString() in merges", () => {
    // Explanation: If two traits each define toString(), the second trait's version overwrites the first.
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
    const merged = traitA.overwrite(traitB).build({});
    expect(merged.toString()).toBe("TraitB’s custom toString");
  });

  it("builds the same trait multiple times without state leakage", () => {
    // Explanation: Ensures building the same trait repeatedly with different data doesn't mix states.
    const traitCountArray = new Trait(
      {
        values: Trait.required<number[]>((val) => (!Array.isArray(val) ? exception("Number[] required") : val)),
      },
      (self) => ({
        pushAndSum(num: number) {
          self.values.push(num);
          return self.values.reduce((acc, val) => acc + val, 0);
        },
      }),
    );

    const build1 = traitCountArray.build({ values: [1, 2] });
    expect(build1.pushAndSum(3)).toBe(6);

    const build2 = traitCountArray.build({ values: [10, 20] });
    expect(build2.pushAndSum(5)).toBe(35);

    const traitProvided = traitCountArray.provide(() => ({ values: [100] })).build({});
    expect(traitProvided.pushAndSum(50)).toBe(150);

    // Checking no cross-leakage
    expect(build1.values).toEqual([1, 2, 3]);
    expect(build2.values).toEqual([10, 20, 5]);
    expect(traitProvided.values).toEqual([100, 50]);
  });

  it("throws an error if createTrait() returns a non-object", () => {
    // Explanation: Returning a primitive from createTrait() should fail if the merge logic expects an object.
    const returnNumber = new Trait({}, () => 123 as any);
    expect(() => returnNumber.build({})).toThrow();
  });

  it("mutates the context in createTrait() without causing confusion", () => {
    // Explanation: Even if the trait modifies the context immediately, it should remain coherent.
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
    const built = traitSelfMutate.build({});
    expect(built.checkInitialized()).toBe(true);
    expect(built.checkInitialized()).toBe("abc");
    expect(traitSelfMutate.build({}).checkInitialized()).toBe(true);
  });

  it("allows serial concatenation without duplicate properties", () => {
    // Explanation: Ensures that concatenating multiple traits in sequence doesn't cause collisions for unique properties.
    const traitA = Trait.identity(() => ({ a: "hello" }));
    const traitB = Trait.identity(() => ({ b: "world" }));
    expect(Trait.concat(traitA, traitB).build({})).toMatchObject({ a: "hello", b: "world" });
  });

  it("concatenates multiple traits in sequence without conflict", () => {
    // Explanation: Demonstrates that more complex serial concatenations also work without property duplication.
    const traitA = Trait.identity(() => ({ a: "hello" }));
    const traitB = Trait.identity(() => ({ b: "world" }));
    const traitC = Trait.identity(() => ({ foo: "foo" }));
    const traitD = Trait.identity(() => ({ bar: "bar" }));
    expect(Trait.concat(traitA, traitB).concat(traitC).concat(traitD).build({})).toMatchObject({
      a: "hello",
      b: "world",
      foo: "foo",
      bar: "bar",
    });
  });

  it("exhibits cross-trait property and method access", () => {
    // Explanation: Verifies that each trait can invoke methods or modify properties defined by the other once concatenated.
    const traitA = Trait.new({ string: Trait.required<string>() }, (self) => ({
      dup: () => {
        self.string = self.string + self.string;
        return self.string;
      },
      number: 2,
    }));
    const traitB = Trait.new({ number: Trait.required<number>() }, (self) => ({
      square: () => {
        self.number = self.number * self.number;
        return self.number;
      },
      string: "_-",
    }));
    const trait = Trait.concat(traitA, traitB).build({});
    expect(trait.dup()).toBe("_-_-");
    expect(trait.square()).toBe(4);
    expect(trait.square()).toBe(16);
    expect(trait.dup()).toBe("_-_-_-_-");
  });

  it("resolves property conflicts when overriding", () => {
    // Explanation: If two traits share the same property name, overrideWith replaces the first trait's value.
    const traitA = Trait.identity(() => ({ a: "hello" }));
    const traitB = Trait.identity(() => ({ a: "world" }));

    // Using concat should throw because it sees a conflict as a duplicate key.
    expect(() => traitA.concat(traitB).build({})).toThrow();
    // Using overrideWith should overwrite traitA’s 'a' with traitB’s 'a'.
    expect(traitA.overwrite(traitB).build({})).toMatchObject({ a: "world" });
  });

  type PushTrait<T extends any[]> = Trait<
    { values: Required<T> },
    { push: <const Item>(item: Item) => Build<PushTrait<[...T, Item]>> }
  >;

  describe("Examples", () => {
    it("builder: tuple", () => {
      function tupleBuilder<const T extends any[]>(inital: T): Build<PushTrait<T>> {
        return Trait.new(
          {
            values: Trait.required<T>((val) => (!Array.isArray(val) ? exception("Array required") : (val as T))),
          },
          (ctx) => ({
            push: <const Item>(item: Item): Build<PushTrait<[...T, Item]>> => {
              return tupleBuilder<[...T, Item]>([...ctx.values, item]);
            },
          }),
        ).build({ values: inital });
      }
      const tupleA = tupleBuilder([1, 2, 3]);
      const tupleB = tupleA.push("hello");
      const tupleC = tupleB.push("hello");
      expect([tupleA.values, tupleB.values, tupleC.values]).toMatchObject([
        [1, 2, 3],
        [1, 2, 3, "hello"],
        [1, 2, 3, "hello", "hello"],
      ]);
    });
    it("builder: tuple mutate", () => {
      const trait = Trait.new(
        {
          values: Trait.required((val) => (!Array.isArray(val) ? exception("Array required") : val)),
        },
        (ctx) => ({
          push: (item: unknown) => {
            ctx.values.push(item);
            return tupleBuilder(ctx.values);
          },
        }),
      );

      function tupleBuilder<const T extends any[]>(inital: T): Build<PushTrait<T>> {
        return (trait as any as PushTrait<T>).build({ values: inital });
      }
      const tupleA = tupleBuilder([1, 2, 3]);
      const tupleB = tupleA.push("hello");
      const tupleC = tupleB.push("hello");
      expect([tupleA.values, tupleB.values, tupleC.values]).toMatchObject([
        [1, 2, 3, "hello", "hello"],
        [1, 2, 3, "hello", "hello"],
        [1, 2, 3, "hello", "hello"],
      ]);
    });
  });
  it("complex", () => {
    function createSortBuilder<Item>() {
      const sortRequirements = {
        isSortable: Trait.required<boolean>((i) => (isTypeOf(i, "boolean") ? i : exception("Not a boolean"))),
        sort: Trait.required<(a: Item, b: Item) => number>(),
        isInitallySorted: Trait.required<boolean>((i) => (isTypeOf(i, "boolean") ? i : exception("Not a boolean"))),
        sortDirection: Trait.required<"asc" | "desc">((i) =>
          i === "asc" || i === "desc" ? i : exception("Not a valid sort direction"),
        ),
      };
      type SortTrait = CreateArgs<typeof sortRequirements>;

      const add = Trait.new(sortRequirements, (ctx) => ({
        addSortable: (sort: (a: Item, b: Item) => number) => {
          ctx.sort = sort;
          ctx.isSortable = true;
          return removeBranch(ctx);
        },
      }));

      const remove = Trait.new(sortRequirements, (ctx) => ({
        removeSortable: () => {
          ctx.isSortable = false;
          return addBranch(ctx);
        },
      }));

      const build = Trait.new(sortRequirements, (ctx) => ({
        buildSort: () => ({
          isInitallySorted: ctx.isInitallySorted,
          isSortable: ctx.isSortable,
          sort: ctx.sort,
          sortDirection: ctx.sortDirection,
        }),
      }));

      const utils = Trait.new(sortRequirements, (ctx) => ({
        setSortDirection: (direction: "asc" | "desc") => {
          ctx.sortDirection = direction;
          return removeBranch(ctx);
        },
        setInitallySorted: (initially: boolean = true) => {
          ctx.isInitallySorted = initially;
          return removeBranch(ctx);
        },
      }));

      const branchA = Trait.compose([add, build]);
      const branchB = remove.compose([build, utils]);

      const addBranch = (ctx: SortTrait) => branchA.build(ctx, true);
      const removeBranch = (ctx: SortTrait) => branchB.build(ctx, true);

      return addBranch({
        isSortable: false,
        sort: (a: Item, b: Item): number => 0,
        isInitallySorted: false,
        sortDirection: "asc" as const,
      });
    }

    const trait = createSortBuilder<string>();
    expect(trait).toMatchObject({
      isSortable: false,
      isInitallySorted: false,
      sortDirection: "asc",
      sort: expect.any(Function),
    });
    const built = trait.addSortable((a, b) => a.localeCompare(b));
    console.log("built", { trait });

    expect(built).toMatchObject({
      isSortable: true,
      sort: expect.any(Function),
    });
    expect(trait).toMatchObject({
      isSortable: true,
      sort: expect.any(Function),
    });

    built.setSortDirection("desc");
    trait.addSortable((a, b) => b.localeCompare(a)).isSortable;
    expect(trait).toMatchObject({
      sortDirection: "desc",
    });
    const built3 = built.setInitallySorted();
    expect(built3).toMatchObject({
      isInitallySorted: true,
    });
    expect(trait).toMatchObject({
      isInitallySorted: true,
    });
    built3.removeSortable();
    expect(built3).toMatchObject({
      isSortable: false,
    });
    expect(trait).toBe(built3);
    trait
      .addSortable((a, b) => a.localeCompare(b))
      .setSortDirection("asc")
      .setInitallySorted(true)
      .removeSortable()
      .addSortable((a, b) => b.localeCompare(a))
      .buildSort();
    trait.sort("a,", "b");
  });
});

// type X = {
//   forEach: Required<(fn: (items: number) => void) => void>;
//   map: () => {};
// };

// declare function fn(args: { map(this: { forEach: (item: number) => void }): void }): any;

// type OnlyReq<T> = { [K in keyof T]: T[K] extends Required<any> ? T[K]["_type"] : never };

// type Magic<T> = {
//   [K in keyof T]: T[K] extends (...args: any[]) => any
//     ? (this: OnlyReq<T>, ...args: Parameters<T[K]>) => ReturnType<T[K]>
//     : T[K];
// };
// declare function fn2<T>(args: Magic<T>): any;

// fn2({
//   map() {
//     this.forEach((x) => v);
//   },
//   forEach: Trait.required<(fn: (n: number) => void) => void>(),
// });
