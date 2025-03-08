import { RequiredOnly, RequiredTrait } from "./required";
import { Trait } from "./trait";

//prettier-ignore
export type Create<$proto, $trait> = {
  [K in keyof $proto | keyof $trait]: 
    K extends keyof $proto  ? K extends keyof $trait        ? [$trait[K]] extends [never]   ? never // K exists in self & trait; self is defined and trait is conflict -> conflict
                                                                                            : $trait[K] extends RequiredTrait<any>  ? $proto[K] // K exists in self & trait; self is defined and trait is requiret -> keep self
                                                                                                                                    : $trait[K] // K exists in self & trait; self is defined and trait is defined -> keep trait
                                                            : $proto[K] // K exists only in self -> keep self
    : K extends keyof $trait? [$trait[K]] extends [never]   ? never // K exists only in the trait
                                                            : $trait[K] extends RequiredTrait<any>  ? never // K is required -> keep self
                                                                                                    : $trait[K] // trait is defined -> keep trait
                            : never;// K not in self or trait
};

//prettier-ignore
export type __hasConflict<$proto, $trait> = {
  [K in keyof $proto | keyof $trait]:
        K extends keyof $proto  ? K extends keyof $trait        ? [$trait[K]] extends [never]   ? true // K in both self & trait, trait is conflict => conflict
                                                                                                : $trait[K] extends RequiredTrait<any>  ? false // K in both self & trait, trait is required => Ok
                                                                                                                                        : true // K in both self & trait, trait is defined => conflict
                                                                : false // only in self => Ok
      : K extends keyof $trait  ? [$trait[K]] extends [never]   ? true // defined in trait, trait is conflict => conflict
                                                                : $trait[K] extends RequiredTrait<any>  ? true  // defined in trait, trait is required => conflict
                                                                                                        : false// defined in trait, trait is definded => ok
        : true ;// K not in self or trait => conflict
};

export function create<const $proto extends RequiredOnly<$trait>, const $trait extends Record<string, unknown>>(
  proto: $proto,
  trait: Trait<$trait>,
): __hasConflict<$proto, $trait> extends true ? never : Create<$proto, $trait> {
  const self = Object.create(proto);
  const properties: PropertyDescriptorMap = {};

  Object.getOwnPropertyNames(trait).forEach((name) => {
    const pd = trait[name]!;
    // check for required properties
    if ("required" in pd && pd.required) {
      if (proto === null || !(name in proto)) {
        throw new Error("Missing required property: " + name);
      }
    }
    // check for conflicts
    else if ("conflict" in pd && pd.conflict) {
      throw new Error("Remaining conflicting property: " + name);
    }
    // data property
    else if ("value" in pd) {
      // method binding
      if ("method" in pd && pd.method) {
        properties[name] = {
          value: Object.freeze(pd.value.bind(self)),
          enumerable: pd.enumerable,
          configurable: pd.configurable,
          writable: pd.writable,
        };
      } else {
        // normal data property
        properties[name] = pd;
      }
    }
    // accessor property
    else {
      properties[name] = {
        get: pd.get ? Object.freeze(pd.get.bind(self)) : undefined,
        set: pd.set ? Object.freeze(pd.set.bind(self)) : undefined,
        enumerable: pd.enumerable,
        configurable: pd.configurable,
      };
    }
  });

  Object.defineProperties(self, properties);
  return Object.freeze(self);
}
