import { describe, expect, it } from "vitest";
import { AssertTrue, Equals } from "../../ts-utils";
import { rename, Rename } from "./rename";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

describe("rename() function", () => {
  describe("Type-level tests for Rename<NameMap, Trait>", () => {
    it("creates an alias for normal properties while marking the original name as required", () => {
      type Original = {
        firstName: string; // normal
        lastName: string; // normal
        age: RequiredTrait<number>; // required
      };
      type Map = {
        firstName: "fname";
        lastName: "lname";
      };

      /**
       * According to the rename logic:
       *   - 'firstName' -> new alias 'fname', original name becomes required
       *   - 'lastName'  -> new alias 'lname', original name becomes required
       *   - 'age' is required => no rename => stays 'age'
       */
      type Renamed = Rename<Map, Original>;
      type Expected = {
        firstName: RequiredTrait<string>; // replaced by required descriptor
        fname: string; // alias
        lastName: RequiredTrait<string>; // replaced by required descriptor
        lname: string; // alias
        age: RequiredTrait<number>;
      };

      AssertTrue<Equals<Renamed, Expected>>();
    });

    it("does not rename properties that are required, leaving them as-is", () => {
      type Original = {
        password: RequiredTrait<string>;
      };
      type Map = {
        password: "secret";
      };

      // Because 'password' is required => skip rename => stays as 'password'
      type Renamed = Rename<Map, Original>;
      type Expected = {
        password: RequiredTrait<string>;
      };
      AssertTrue<Equals<Renamed, Expected>>();
    });

    it("does nothing for keys not in the map", () => {
      type Original = {
        foo: number;
        bar: string;
      };
      type Map = {
        foo: "f";
      };

      /**
       * Only 'foo' is renamed => 'foo' -> required, plus a 'f' alias.
       * 'bar' is left alone, because it's not in Map.
       */
      type Renamed = Rename<Map, Original>;
      type Expected = {
        foo: RequiredTrait<number>;
        f: number;
        bar: string;
      };
      AssertTrue<Equals<Renamed, Expected>>();
    });

    it("produces both the original name (marked required) and the new alias if normal property is mapped", () => {
      type Original = {
        x: number;
      };
      type Map = {
        x: "aliasX";
      };

      type Renamed = Rename<Map, Original>;
      type Expected = {
        x: RequiredTrait<number>;
        aliasX: number;
      };
      AssertTrue<Equals<Renamed, Expected>>();
    });
  });

  describe("Runtime tests for rename()", () => {
    it("renames normal properties to an alias and marks the original as required", () => {
      const traitA: Trait<{ firstName: string; lastName: string; age: number }> = {
        firstName: { _type: null!, value: "Alice", enumerable: true, configurable: true },
        lastName: { _type: null!, value: "Smith", enumerable: true, configurable: true },
        age: { _type: null!, value: 30, enumerable: false, configurable: true },
      };

      const map = { firstName: "fname", lastName: "lname" } as const;
      const result = rename(map, traitA);

      // We should see:
      //   result.fname = traitA.firstName
      //   result.firstName = required
      //   result.lname = traitA.lastName
      //   result.lastName = required
      //   'age' left as is
      expect(result.fname.value).toBe("Alice");
      expect(result.lname.value).toBe("Smith");
      expect(result.firstName.required).toBe(true);
      expect(result.lastName.required).toBe(true);
      expect(result.age.value).toBe(30);
    });

    it("does not rename required properties, leaving them under the original key", () => {
      const traitB: Trait<{ secret: RequiredTrait<string>; other: string }> = {
        secret: { required: true, _type: null!, value: null },
        other: { _type: null!, value: "foo" },
      };
      const map = { secret: "newKey" } as const;

      const result = rename(map, traitB);
      // 'secret' is required => no rename => still 'secret'
      // 'other' was not in the map => no rename
      expect(Object.keys(result)).toEqual(["secret", "other"]);
      expect(result.secret.required).toBe(true);
      expect(result.other.value).toBe("foo");
    });

    it("marks alias as conflicting if two normal properties map to the same alias", () => {
      const traitC: Trait<{ a: number; b: number }> = {
        a: { _type: null!, value: 1, enumerable: true, configurable: true },
        b: { _type: null!, value: 2, enumerable: true, configurable: true },
      };
      const map = { a: "aliasX", b: "aliasX" } as const;

      const result: any = rename(map, traitC);
      // Both 'a' and 'b' map to 'aliasX', so 'aliasX' is set to a conflict descriptor
      expect(result.aliasX.conflict).toBe(true);

      // Also, original 'a' & 'b' should each become required
      expect(result.a.required).toBe(true);
      expect(result.b.required).toBe(true);
    });

    it("preserves previously aliased property if a later required property tries to rename to it", () => {
      const traitD: Trait<{ x: string; y: RequiredTrait<number> }> = {
        x: { _type: null!, value: "rename me", enumerable: true },
        y: { required: true, _type: null!, value: null },
      };
      const map = { x: "aliasX", y: "aliasX" } as const;

      const result = rename(map, traitD);
      // 'x' => normal => rename => 'aliasX'
      // 'y' => required => do NOT rename => stays 'y'
      // Also, 'x' => becomes required under the original name
      expect(result.aliasX.value).toBe("rename me");
      expect(result.x.required).toBe(true);

      // 'y' remains at 'y', no conflict for 'aliasX'
      expect(result.y.required).toBe(true);
    });

    it("returns a frozen object", () => {
      const traitE: Trait<{ foo: string }> = {
        foo: { _type: null!, value: "bar", enumerable: true, configurable: true },
      };
      const map = { foo: "baz" } as const;
      const result = rename(map, traitE);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });
});
