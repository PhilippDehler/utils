// import { it } from "vitest";
// import { exception } from "../error";
// import { isNil } from "../guards/isNil";
// import { isTypeOf } from "../guards/isTypeOf";

// const typeParser = {
//   string: (value: unknown): value is string => isTypeOf(value, "string"),
//   number: (value: unknown): value is string => isTypeOf(value, "number"),
//   boolean: (value: unknown): value is string => isTypeOf(value, "boolean"),
//   date: (value: unknown): value is string => (value instanceof Date ? !isNaN(new Date(value).getTime()) : false),
// };
// type DataTypeMap = {
//   string: string;
//   number: number;
//   boolean: boolean;
//   date: Date;
// };
// type DataType = keyof DataTypeMap;

// function stringify<DataType extends keyof DataTypeMap>(type: DataType, value: DataTypeMap[DataType]) {
//   return `${value}`;
// }
// const DELIMITER = " ";
// function stringifyPk<Fields extends Record<string, FieldDefinition<DataType, boolean>>>(
//   fields: Fields,
//   data: Data<Fields>,
// ) {
//   return Object.values(fields)
//     .map((field) => {
//       const item = (data as any)[field.name];
//       if (item === null || item === undefined) exception("Field cannot be null");
//       return stringify(field.type, item);
//     })
//     .join(DELIMITER);
// }

// class PrimaryKey<const Fields extends Record<string, FieldDefinition<DataType, boolean>>> {
//   index: Record<string, number> = {};
//   constructor(public fields: Fields) {
//     this.#validateFields(fields);
//   }
//   #validateFields(fields: Fields) {
//     for (const field of Object.values(fields)) {
//       if (field.nullable) throw new Error("Primary key cannot be nullable");
//     }
//   }
//   clear() {
//     this.index = {};
//   }
//   add(data: Data<Fields>, index: number) {
//     const pk = this.getPrimaryKey(data);
//     if (this.index[pk] !== undefined) throw new Error("Primary key already exists");
//     this.index[pk] = index;
//     return pk;
//   }
//   getPrimaryKey(data: Data<Fields>) {
//     return stringifyPk(this.fields, data);
//   }
//   getIndex(data: Data<Fields>) {
//     return this.index[this.getPrimaryKey(data)];
//   }
//   rebuild() {
//     const self = this;
//     let copy = { ...this.index };
//     this.clear();
//     let shouldRollback = true;
//     return {
//       add(data: Data<Fields>, index: number) {
//         return self.add(data, index);
//       },
//       done() {
//         shouldRollback = false;
//       },
//       [Symbol.dispose]() {
//         if (shouldRollback) self.index = copy;
//       },
//     };
//   }
// }
// function stringifyUq<Fields extends Record<string, FieldDefinition<DataType, boolean>>>(
//   fields: Fields,
//   data: Data<Fields>,
// ) {
//   let uq = "";
//   for (const field of Object.values(fields)) {
//     const item = (data as any)[field.name];
//     if (item === null || item === undefined) return null; // no index
//     uq += stringify(field.type, item);
//   }
//   if (uq === "") return null;
//   return uq;
// }
// class UniqueConstraint<const Fields extends Record<string, FieldDefinition<DataType, boolean>>> {
//   constructor(public fields: Fields) {}
//   index: Record<string, string> = {};
//   check(data: Data<Fields>) {
//     const uq = stringifyUq(this.fields, data);
//     if (uq === null) return null;
//     if (this.index[uq] !== undefined) throw new Error("Unique constraint violated");
//     return uq;
//   }
//   add(data: Data<Fields>, pk: string) {
//     const uq = this.check(data);
//     if (uq === null) return;
//     this.index[uq] = pk;
//   }
//   clear() {
//     this.index = {};
//   }
//   rebuild() {
//     const self = this;
//     let copy = { ...this.index };
//     this.clear();
//     let shouldRollback = true;
//     return {
//       add(data: Data<Fields>, pk: string) {
//         self.add(data, pk);
//       },
//       done() {
//         shouldRollback = false;
//       },
//       [Symbol.dispose]() {
//         if (shouldRollback) self.index = copy;
//       },
//     };
//   }
// }

// type InferPk<Pk> = Pk extends PrimaryKey<infer T> ? Data<T> : never;

// type Insert<Fields extends Record<string, FieldDefinition<DataType, boolean>>> = {
//   [K in NullableKeys<Fields>]?: Data<Fields>[K] | null;
// } & { [K in NonNullableKeys<Fields>]: Data<Fields>[K] };

// type Update<Pk, Fields extends Record<string, FieldDefinition<DataType, boolean>>> = [
//   InferPk<Pk>,
//   { [K in NonNullableKeys<Fields>]?: Data<Fields>[K] | undefined } & {
//     [K in NullableKeys<Fields>]?: Data<Fields>[K] | null;
//   },
// ];

// type NullableKeys<Fields extends Record<string, FieldDefinition<DataType, boolean>>> = {
//   [K in keyof Fields]: Fields[K]["nullable"] extends true ? K : never;
// }[keyof Fields];
// type NonNullableKeys<Fields extends Record<string, FieldDefinition<DataType, boolean>>> = {
//   [K in keyof Fields]: Fields[K]["nullable"] extends false ? K : never;
// }[keyof Fields];

// class Table2<
//   const Fields extends Record<string, FieldDefinition<DataType, boolean>>,
//   const $PrimaryKey extends PrimaryKey<any>,
//   const $UniqueConstraints extends Record<string, UniqueConstraint<any>>,
// > {
//   pk: $PrimaryKey;
//   dataFields: DataFields<Fields>;
//   data: Data<Fields>[] = [];
//   unique: $UniqueConstraints;
//   constructor(
//     public fields: Fields,
//     pk: (field: DataFields<Fields>) => $PrimaryKey,
//     constraints: (field: DataFields<Fields>) => {
//       unique?: $UniqueConstraints;
//     },
//   ) {
//     this.dataFields = Object.entries(fields).reduce((acc, [key, value]) => {
//       (acc as any)[key] = { ...value, name: key };
//       return acc;
//     }, {} as DataFields<Fields>);
//     this.pk = pk(this.dataFields);
//     this.unique = constraints(this.dataFields).unique! ?? {};
//   }
//   rebuild(fields: Set<keyof Fields> = new Set(Object.keys(this.dataFields))) {
//     using unique = new DisposableStack();
//     using pk = this.pk.rebuild();
//     const constraints = Object.entries(this.unique)
//       .filter(([key]) => fields.has(key))
//       .map(([_, value]) => value);

//     const resources = new Array(constraints.length).fill(0).map((_, i) => unique.use(constraints[i]!.rebuild()));

//     for (let i = 0; i < this.data.length; i++) {
//       const primaryKey = pk.add(this.data[i]!, i);
//       resources.forEach((r) => r.add(this.data[i]!, primaryKey));
//     }
//     resources.forEach((r) => r.done());
//     pk.done();
//   }

//   parseField<T extends DataType>(field: FieldDefinition<T, boolean>, row: unknown) {
//     if (!isTypeOf(row, "object") || row === null) exception("Data must be an object");
//     const value = (row as any)[field.name];
//     if (field.nullable && isNil(value)) return;
//     if (isNil(value)) throw new Error("Field cannot be null");
//     if (!typeParser[field.type](value)) throw new Error("Type mismatch");
//     return value as DataTypeMap[T];
//   }

//   parseRow(row: unknown): Data<Fields> {
//     const internal: Data<Fields> = {} as any;
//     for (const key in this.dataFields) {
//       (internal as any)[key] = this.parseField(this.dataFields[key]!, row);
//     }
//     return internal;
//   }

//   insert(row: Insert<Fields>) {
//     this.pk.add(row, this.data.push(this.parseRow(row)) - 1);
//   }

//   $update(updateArgs: Update<$PrimaryKey, Fields>[1], row: Data<Fields>): [Data<Fields>, Set<keyof Fields>] {
//     const changed = new Set<keyof Fields>();
//     const changedRow = { ...row };
//     for (const key in this.dataFields) {
//       if (isNil(row[key])) continue;
//       const newValue = (updateArgs as any)[key];
//       const oldValue = row[key];
//       if (newValue === undefined) continue;
//       if (newValue === oldValue) continue;
//       changedRow[key] = this.parseField(this.dataFields[key], newValue) as any;
//       changed.add(key);
//     }
//     return [changedRow, changed];
//   }
//   update([pk, updateArgs]: Update<$PrimaryKey, Fields>) {
//     const index = this.pk.getIndex(pk);
//     if (index === undefined) exception("Primary key not found");
//     const node = this.data[index];
//     if (!node) exception("Primary key not found");

//     const [updated, rowChange] = this.$update(updateArgs, node);
//     this.data[index] = updated;
//     this.rebuild(rowChange);
//   }

//   delete(data: InferPk<$PrimaryKey>) {
//     const pk = this.pk.getPrimaryKey(data);
//     const index = this.pk.index[pk];
//     if (index === undefined) throw new Error("Primary key not found");
//     this.data.splice(index, 1);
//     this.rebuild();
//   }

//   byPk(data: InferPk<$PrimaryKey>) {
//     const index = this.pk.getIndex(data);
//     if (index === undefined) return null;
//     return this.data[index] ?? null;
//   }
// }

// it.only("hello", () => {
//   const table = new Table2(
//     {
//       id: {
//         type: "string",
//         name: "id",
//         nullable: false,
//       },
//       age: {
//         type: "string",
//         name: "age",
//         nullable: true,
//       },
//       address: {
//         type: "string",
//         name: "address",
//         nullable: true,
//       },
//     },
//     (data) =>
//       new PrimaryKey({
//         id: data.id,
//       }),
//     (field) => ({
//       unique: {
//         age: new UniqueConstraint({
//           age: field.age,
//         }),
//       },
//     }),
//   );

//   const TableSize = 10_000_000;
//   console.log("create data");
//   let data: { id: string }[] = [];
//   measure(() => {
//     for (let i = 0; i < TableSize; i++) {
//       data.push({ id: `${i}` });
//     }
//   }, 1);
//   console.log("done data");
//   console.log("insert data");
//   measure(() => {
//     for (const some of data) {
//       table.insert(some);
//     }
//   }, 1);
//   console.log("finish data");
//   function measure(fn: () => void, times: number) {
//     const timestamps = [];
//     for (let i = 0; i < times; i++) {
//       const now = performance.now();
//       fn();
//       timestamps.push(performance.now() - now);
//     }
//     const sum = timestamps.reduce((acc, curr) => acc + curr, 0);
//     console.log("sum:", sum / 1000);
//     console.log("avg:", sum / 1000 / times);
//   }
//   console.log("byId");
//   measure(() => {
//     table.getById({ id: `${TableSize / 2}`, age: null });
//   }, 3000000);
//   console.log("findById");
//   measure(() => {
//     data.find((d) => d.id === `${TableSize / 2}`);
//   }, 10);
// });

// interface FieldDefinition<type extends DataType, Nullable extends boolean> {
//   name: string;
//   type: type;
//   nullable: Nullable;
// }
// type DataFields<Fields extends Record<string, FieldDefinition<DataType, boolean>>> = {
//   [K in keyof Fields]: Fields[K] & { name: K };
// };

// type Data<Fields extends Record<string, FieldDefinition<DataType, boolean>>> = {
//   [K in keyof Fields]: DataTypeMap[Fields[K]["type"]] | (Fields[K]["nullable"] extends true ? null : never);
// };

// class Index<
//   const Name extends string,
//   const Fields extends Record<string, FieldDefinition<string, DataType, boolean>>,
// > {
//   index: Record<string, string[]>;
//   #stringify: (data: Data<Fields>) => string;
//   constructor(
//     public name: Name,
//     public fields: Fields,
//     private getPk: (data: Data<Fields>) => string,
//   ) {
//     this.index = {};
//     this.#stringify = (data) =>
//       Object.values(fields)
//         .map((field) => stringify(field.type, (data as any)[field.name]))
//         .join(DELIMITER);
//   }
//   find(data: Data<Fields>) {
//     return this.index[this.#stringify(data)];
//   }
//   add(data: Data<Fields>) {
//     console.log(data);

//     const pk = this.getPk(data);
//     const search = this.#stringify(data);
//     this.index[search] ??= [];
//     this.index[search].push(pk);
//   }
//   clear(): void {
//     this.index = {};
//   }
// }

// class Unique<const Name extends string, const Fields extends Record<string, FieldDefinition<string, DataType, boolean>>>
//   implements Constraint<Name, Fields>
// {
//   type = "unique" as const;
//   index: Set<string> = new Set();

//   #stringify: (data: Data<Fields>) => string;
//   constructor(
//     public name: Name,
//     public fields: Fields,
//   ) {
//     this.index = new Set();
//     this.#stringify = (data) =>
//       Object.values(fields)
//         .map((field) => stringify(field.type, (data as any)[field.name]))
//         .join(DELIMITER);
//   }
//   check(data: Data<Fields>) {
//     if (this.index.has(this.#stringify(data))) {
//       exception(
//         `[UNIQUE_CONSTRAINT_VIOLATED]: Constraint: ${this.name}; fields: [${Object.values(this.fields)
//           .map((f) => f.name)
//           .join(",")}]`,
//       );
//     }
//   }
//   clear(): void {
//     this.index.clear();
//   }
// }

// class Check<const Name extends string, const Fields extends Record<string, FieldDefinition<string, DataType, boolean>>>
//   implements Constraint<Name, Fields>
// {
//   type = "check" as const;
//   indexable = false;
//   constructor(
//     public name: Name,
//     public fields: Fields,
//     public predicate: (data: Data<Fields>) => boolean,
//   ) {}
//   check(data: Data<Fields>) {
//     if (!this.predicate(data)) exception(`[CHECK_CONSTRAINT_VIOLATED]:${this.name} constraint violated`);
//   }
//   clear(): void {}
// }

// interface Constraint<Name extends string, Fields extends Record<string, FieldDefinition<string, DataType, boolean>>> {
//   name: Name;
//   fields: Fields;
//   type: "unique" | "check";
//   check(data: Data<Fields>): void;
//   clear(): void;
// }

// class Table<
//   const Fields extends Record<string, FieldDefinition<string, DataType, boolean>>,
//   Indexes extends Record<string, Index<string, Fields>>,
//   Constraints extends Record<string, Constraint<string, any>>,
// > {
//   constraints: Constraints;
//   indexes: Indexes;
//   constructor(
//     private fields: Fields,
//     indexes: (fields: Fields) => Indexes,
//     fn: (fields: Fields) => Constraints,
//   ) {
//     this.constraints = fn(fields);
//     this.indexes = indexes(fields);
//   }

//   checkDataConstraint(field: FieldDefinition<string, DataType, boolean>, data: Data<Fields>) {
//     if (data[field.name] === null && !field.nullable) throw new Error("Field cannot be null");
//   }
//   checkConstraint(data: Data<Fields>) {
//     for (const key in this.constraints) {
//       const constraint = this.constraints[key];
//       if (!constraint) return exception(`[CONSTRAINT_NOT_FOUND]: Constraint ${key} not found`);
//       constraint.check(data);
//     }
//   }

//   rebuildIndex(data: Data<Fields>[]) {
//     const indexes = Object.values(this.indexes);
//     indexes.forEach((index) => index.clear());
//     data.forEach((d) => this.addIndex(d));
//   }

//   addIndex(data: Data<Fields>) {
//     for (const index of Object.values(this.indexes)) index.add(data);
//   }
//   addUnique(data: Data<Fields>) {
//     for (const constraint of Object.values(this.constraints)) {
//       if (constraint.type === "unique") constraint.check(data);
//     }
//   }

//   insert(data: Data<Fields>) {
//     for (const field of Object.values(this.fields)) {
//       this.checkDataConstraint(field, data);
//       this.checkConstraint(data);
//     }
//     this.addUnique(data);
//     this.addIndex(data);
//   }
// }

// it("hello", () => {
//   const x = new Table(
//     {
//       id: {
//         name: "id",
//         type: "string",
//         nullable: false,
//         default: () => "1",
//       },
//       age: {
//         name: "age",
//         type: "string",
//         nullable: true,
//         default: () => "1",
//       },
//     },
//     (fields) => ({
//       uniq: new PrimaryKey("uniq", fields, (data) => data.id),
//     }),
//     (fields) => ({
//       uniq: new Index("uniq", fields, (data) => data.id),
//     }),
//     (fields) => ({
//       uniq: new Unique("uniq", { id: fields.id, age: fields.age }),
//       id_is_always_lower_than_age: new Check("id_is_always_lower_than_age", fields, (data) => data.id < data.age),
//     }),
//   );
//   x.insert({ id: "1", age: "2" });
//   x.insert({ id: "1", age: "3" });
//   console.log(x);
// });
