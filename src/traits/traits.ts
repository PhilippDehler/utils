export const n = null;

type Constraint = Trait<any, any>;
type Required<T> = { key: `<REQUIRED_TRAIT>`; _type: T; parser?: (unk: unknown) => T };
type Identity<T> = Trait<{}, (args: Args<{}>) => T>;
type UnwrapRequired<T> = {
  [K in keyof T]: T[K] extends Required<infer U> ? U : T[K];
};

export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never;
};
type Diff<A, B> = {
  [K in Exclude<keyof A, keyof B>]: A[K];
};

type Concat<A extends Constraint, B extends Constraint> = Trait<
  Merge<A["req"], Diff<B["req"], A["create"]>>,
  (self: UnwrapRequired<A["req"]> & Parameters<B["create"]>[0]) => ReturnType<A["create"]> & ReturnType<B["create"]>
>;

function checkRequirements(
  ctx: Record<string, unknown>,
  keys: Record<string, { parser?: (u: unknown) => unknown }>
): void {
  console.log("checkRequirements");
  if (keys === null || typeof keys !== "object") {
    throw new Error("Expected an object");
  }
  for (const key of Object.getOwnPropertyNames(keys)) {
    if (ctx[key] === undefined) {
      throw new Error(`Missing required key: ${key}`);
    }
    keys[key]?.parser?.(ctx[key]);
  }
}

type Args<T> = UnwrapRequired<T>;

function required<T>(parser?: (unk: unknown) => T): Required<T> {
  return { key: `<REQUIRED_TRAIT>`, _type: {} as T, parser };
}
function empty(): Trait<{}, (ctx: Args<Trait["req"]>) => {}> {
  return new Trait<{}, (ctx: UnwrapRequired<{}>) => {}>({}, () => ({}));
}

function create<$Required, $Trait>(
  req: $Required,
  createTrait: (ctx: Args<$Required>) => $Trait
): (ctx: Args<$Required>) => $Trait {
  console.log("create", { req, createTrait });
  return (ctx) => {
    console.group("create");
    console.log("create");

    console.log("createTrait");
    const trait = createTrait(ctx);
    if (trait === null || typeof trait !== "object") {
      throw new Error("Expected an object");
    }
    const nextContext = merge(ctx, trait);
    checkRequirements(nextContext, req as any);
    console.groupEnd();
    return nextContext;
  };
}

function merge<A, B>(self: A, trait: B): A & B {
  console.log("merge", { self, trait });
  for (const key of Object.getOwnPropertyNames(trait)) {
    (self as any)[key] = (trait as any)[key];
  }
  return self as any;
}

function concat<A extends Constraint, B extends Constraint>(a: A, b: B): Concat<A, B> {
  return new Trait({ ...a.req, ...b.req }, (context) => {
    const traitA = a.create(context);
    merge(context, traitA);
    const traitB = b.create(context);
    return merge(context, traitB);
  });
}

function identity<T>(fn: (arg: Args<{}>) => T): Identity<T> {
  return new Trait({}, fn);
}

function provide<$trait extends Constraint, Req extends Partial<Args<$trait["req"]>>>(
  trait: $trait,
  provideValue: () => Req
): Concat<Trait<{}, (args: Args<{}>) => Req>, $trait> {
  return identity(provideValue).concat(trait);
}

export class Trait<$required = {}, $trait extends (self: Args<$required>) => any = (self: Args<$required>) => {}> {
  create: $trait;

  constructor(public req: $required, createTrait: $trait) {
    this.create = Trait.create(req, createTrait) as any;
  }
  static required = required;
  static create = create;
  static empty = empty;
  static concat = concat;
  static provide = provide;
  static identity = identity;

  static new<$required = {}, $trait extends (self: Args<$required>) => any = (self: Args<$required>) => {}>(
    req: $required,
    createTrait: $trait
  ): Trait<$required, $trait> {
    return new Trait<$required, $trait>(req, createTrait);
  }

  concat<B extends Constraint>(b: B): Concat<this, B> {
    return Trait.concat(this, b);
  }

  provide<Req extends Partial<Args<$required>>>(provideValue: () => Req): Concat<Trait<{}, () => Req>, this> {
    return identity(provideValue).concat(this);
  }

  build(pV: () => Diff<Args<this["req"]>, ReturnType<this["create"]>>): ReturnType<this["create"]> & Args<this["req"]> {
    console.log("build");
    const provided = pV();
    return merge(provided, this.create(provided as any));
  }

  static compose<const Traits extends [any, ...any[]]>(traits: Traits): Compose<Traits> {
    const agg = traits[0];
    for (let i = 1; i < traits.length; i++) {
      if (!(traits[i] instanceof Trait)) {
        throw new Error("Expected an instance of Trait");
      }
      agg.concat(traits[i]);
    }
    return agg;
  }
  compose<const Traits extends [any, ...any[]]>(traits: Traits): Compose<Traits> {
    let agg: any = this;
    for (let i = 0; i < traits.length; i++) {
      if (!(traits[i] instanceof Trait)) {
        throw new Error("Expected an instance of Trait");
      }
      agg = agg.concat(traits[i]);
    }
    return agg;
  }
}

type Compose<Traits, agg extends Constraint = Trait> = Traits extends [infer Tr extends Constraint, ...infer R]
  ? Compose<R, Concat<agg, Tr>>
  : agg;

new Trait({ cell: required() }, (ctx) => ({}));
