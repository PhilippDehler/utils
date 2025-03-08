import { Trait } from "./trait";

//prettier-ignore
export type __override<$proto, $trait> = {
  [K in keyof $proto | keyof $trait]:
    // self is defined and required and $trait exists -> keep self
    K extends keyof $proto ? $proto[K] extends Required<any> ? K extends keyof $trait ? $trait[K]
    // self is defined and required and $trait not exists -> keep self
                                                                                       : $proto[K] 
    // self is defined and not required -> keep self
                                                              : $proto[K] 
    // self is not defined and $trait exists -> keep $trait
                            : K extends keyof $trait ? $trait[K]
    : never;
};

export type Override<Traits, $proto = {}> = Traits extends [Trait<infer T>, ...infer R]
  ? Override<R, __override<$proto, T>>
  : $proto;

/**
 * var newTrait = override(trait_1, trait_2, ..., trait_N)
 *
 * @returns a new trait with all of the combined properties of the
 *          argument traits.  In contrast to 'compose', 'override'
 *          immediately resolves all conflicts resulting from this
 *          composition by overriding the properties of later
 *          traits. Trait priority is from left to right. I.e. the
 *          properties of the leftmost trait are never overridden.
 *
 *  override is associative:
 *    override(t1,t2,t3) is equivalent to override(t1, override(t2, t3)) or
 *    to override(override(t1, t2), t3)
 *  override is not commutative: override(t1,t2) is not equivalent
 *    to override(t2,t1)
 *
 * override() returns an empty trait
 * override(trait_1) returns a trait equivalent to trait_1
 */

export function override<$Traits extends Trait<any>[]>(...traits: $Traits): Override<$Traits> {
  const newTrait: Record<string, PropertyDescriptor & { required?: boolean }> = {};
  traits.forEach(function (trait) {
    Object.getOwnPropertyNames(trait).forEach(function (name) {
      const pd = trait[name]!;
      // add this trait's property to the composite trait only if
      // - the trait does not yet have this property
      // - or, the trait does have the property, but it's a required property
      if (!newTrait.hasOwnProperty(name) || newTrait[name]!.required) {
        newTrait[name] = pd;
      }
    });
  });
  return Object.freeze(newTrait) as Override<$Traits>;
}
