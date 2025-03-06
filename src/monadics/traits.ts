export type Required<$TraitValueType> = {
  key: `<REQUIRED_TRAIT>`;
  _type: $TraitValueType;
  parser?: (unk: unknown) => $TraitValueType;
};

namespace Constraint {
  export type $Required<T = any> = Record<string, Required<T>>;
  export type $Properties = Record<string, any>;
  export type $Trait = Trait<any, any>;
}

export type CreateArgs<$Required extends Constraint.$Required> = {
  [Key in keyof $Required]: $Required[Key]["_type"];
};

type Create<$Required extends Constraint.$Required, $Trait extends Constraint.$Properties> = (
  args: CreateArgs<$Required>
) => $Trait;

type Concat<$A extends Constraint.$Trait, $B extends Constraint.$Trait> = Trait<
  Merge<$A["required"], $B["required"]>,
  Merge<$A["_definedTraitProperties"], $B["_definedTraitProperties"]>
>;

type Overwrite<$A extends Constraint.$Trait, $B extends Constraint.$Trait> = Trait<
  Merge<$A["required"], $B["required"]>,
  Merge<$B["_definedTraitProperties"], $A["_definedTraitProperties"]>
>;

type Compose<$Traits, $agg extends Constraint.$Trait = Trait> = $Traits extends [
  infer Tr extends Constraint.$Trait,
  ...infer R
]
  ? Compose<R, Concat<$agg, Tr>>
  : $agg;

type Identity<$Trait extends Constraint.$Properties> = Trait<{}, $Trait>;

export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never;
};
export type Build<T extends Constraint.$Trait> = T["_definedTraitProperties"] & T["_requiredCreateParameters"];

export class Trait<$Required extends Constraint.$Required = {}, $Trait extends Constraint.$Properties = {}> {
  _definedTraitProperties!: $Trait;
  _requiredCreateParameters!: CreateArgs<$Required>;

  constructor(public required: $Required, public create: Create<$Required, $Trait>) {}

  static required<T>(parser?: (unk: unknown) => T): Required<T> {
    return { key: `<REQUIRED_TRAIT>`, _type: null! as T, parser };
  }

  static isEquivalent<A extends Constraint.$Trait, B extends Constraint.$Trait>(self: A, trait: B): boolean {
    for (const key of Object.getOwnPropertyNames(trait)) {
      const selfDesc = Object.getOwnPropertyDescriptor(self, key);
      const traitDesc = Object.getOwnPropertyDescriptor(trait, key);
      if (selfDesc && traitDesc) {
        if (isSamePropertyDescriptor(selfDesc, traitDesc)) continue;
        return false;
      }
    }
    return true;
  }

  static empty() {
    return Trait.new({}, () => ({}));
  }
  static identity<T extends Constraint.$Properties>(fn: Create<{}, T>): Identity<T> {
    return Trait.new({}, fn);
  }

  static new<$required extends Constraint.$Required, const $trait extends Constraint.$Properties>(
    req: $required,
    createTrait: Create<$required, $trait>
  ): Trait<$required, $trait> {
    return new Trait<$required, $trait>(req, createTrait);
  }

  static concat<A extends Constraint.$Trait, B extends Constraint.$Trait>(a: A, b: B): Concat<A, B> {
    return new Trait(mergeReq(a.required, b.required), (context) => merge(a.create(context), b.create(context)));
  }

  static overwrite<A extends Constraint.$Trait, B extends Constraint.$Trait>(a: A, b: B): Overwrite<A, B> {
    return new Trait(mergeReq(a.required, b.required), (context) => overwrite(a.create(context), b.create(context)));
  }
  static provide<$trait extends Constraint.$Trait, Req extends Partial<$trait["_requiredCreateParameters"]>>(
    trait: $trait,
    provideValue: () => Req
  ): Concat<Identity<Req>, $trait> {
    return Trait.concat(Trait.identity(provideValue), trait);
  }

  static compose<const Traits extends [any, ...any[]]>(traits: Traits): Compose<Traits> {
    return traits.slice(1).reduce((agg, trait) => agg.concat(trait), traits[0]);
  }

  isEquivalent<B extends Trait>(b: B): boolean {
    return Trait.isEquivalent(this, b);
  }

  overwrite<B extends Constraint.$Trait>(b: B): Overwrite<this, B> {
    return Trait.overwrite(this, b);
  }
  excludeTs<Keys extends string>(...keys: Keys[]): Trait<$Required, Omit<this["_definedTraitProperties"], Keys>> {
    return this as any;
  }

  concat<B extends Constraint.$Trait>(b: B): Concat<this, B> {
    return Trait.concat(this, b);
  }

  provide<Req extends Partial<this["_requiredCreateParameters"]>>(
    provideValue: () => Req
  ): Concat<Identity<Req>, this> {
    return Trait.provide(this, provideValue);
  }

  compose<const Traits extends [any, ...any[]]>(traits: Traits): Compose<[this, ...Traits]> {
    return Trait.compose([this, ...traits]);
  }
  exclude<Keys extends string>(...keys: Keys[]): Trait<$Required, Omit<this["_definedTraitProperties"], Keys>> {
    return Trait.new(this.required, (context) => {
      const trait = this.create(context);
      for (const key of keys) {
        delete trait[key];
      }
      return trait;
    }) as any;
  }

  build(
    req: Diff<this["_requiredCreateParameters"], this["_definedTraitProperties"]>,
    shouldOverwrite: boolean = false
  ): Build<this> {
    const trait = this.create(req as any);

    if (typeof trait !== "object") throw new Error("Expected an object");

    const received = shouldOverwrite ? overwrite(req, trait) : merge(req, trait);
    assertRequirements(this, received);
    return received as any;
  }
}

type Diff<A, B> = {
  [K in Exclude<keyof A, keyof B>]: A[K];
};

function mergeReq(a: any, b: any): any {
  const aKeys = Object.getOwnPropertyNames(a);
  const bKeys = Object.getOwnPropertyNames(b);
  const keys = new Set([...aKeys, ...bKeys]);
  const result: any = {};
  for (const key of keys) {
    if (a[key] !== undefined && b[key] !== undefined) {
      if (a[key] === b[key]) continue;
      throw new Error(`Required key already exists: ${key}`);
    }
    if (a[key] !== undefined) result[key] = a[key];
    if (b[key] !== undefined) result[key] = b[key];
  }
  return result;
}

function merge<A extends Constraint.$Properties, B extends Constraint.$Properties>(self: A, trait: B): Merge<A, B> {
  const properties: Constraint.$Properties = {};
  for (const key of Object.getOwnPropertyNames(trait)) {
    const selfDesc = Object.getOwnPropertyDescriptor(self, key);
    const traitDesc = Object.getOwnPropertyDescriptor(trait, key);
    if (selfDesc && traitDesc) {
      if (isSamePropertyDescriptor(selfDesc, traitDesc)) continue;
      throw new Error(`Conflict duplicate key. Property descriptor mismatch: ${key}.`);
    }
    properties[key] = traitDesc;
  }
  const merged: Merge<A, B> = Object.defineProperties(self, properties) as any;
  return merged;
}

function isSamePropertyDescriptor(a: PropertyDescriptor, b: PropertyDescriptor): boolean {
  return (
    a.configurable === b.configurable &&
    a.enumerable === b.enumerable &&
    a.writable === b.writable &&
    a.value === b.value &&
    a.get === b.get &&
    a.set === b.set
  );
}

function assertRequirements<$required extends Constraint.$Required>(
  trait: Trait<$required, any>,
  ctx: Constraint.$Properties
): CreateArgs<$required> {
  const requirements = trait.required ?? {};
  const parsed: any = {};
  if (typeof requirements !== "object") throw new Error("Expected an object");
  for (const key of Object.getOwnPropertyNames(requirements)) {
    if (ctx[key] === undefined) throw new Error(`Missing required key: ${key}`);
    parsed[key] = requirements[key]?.parser?.(ctx[key]) ?? ctx[key];
  }
  return parsed as CreateArgs<$required>;
}

function overwrite<A, B>(self: A, trait: B): Merge<B, A> {
  const properties: Constraint.$Properties = {};
  for (const key of Object.getOwnPropertyNames(trait)) {
    const traitDesc = Object.getOwnPropertyDescriptor(trait, key);
    properties[key] = traitDesc;
  }
  const merged: Merge<B, A> = Object.defineProperties(self, properties) as any;
  return merged;
}
