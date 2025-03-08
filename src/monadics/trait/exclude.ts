import { makeRequiredPropDesc } from "./property-descriptors";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

/* var newTrait = exclude(['name', ...], trait)
 *
 * @param names a list of strings denoting property names.
 * @param trait a trait some properties of which should be excluded.
 * @returns a new trait with the same own properties as the original trait,
 *          except that all property names appearing in the first argument
 *          are replaced by required property descriptors.
 *
 * Note: exclude(A, exclude(B,t)) is equivalent to exclude(A U B, t)
 */
export type Exclude<$proto, $names extends keyof $proto | (string & {})> = {
  [K in keyof $proto]: K extends $names
    ? $proto[K] extends RequiredTrait<any>
      ? $proto[K]
      : RequiredTrait<$proto[K]>
    : $proto[K];
};

export function exclude<$Trait extends Record<string, unknown>, const Names extends keyof $Trait & string>(
  trait: Trait<$Trait>,
  ...names: Names[]
): Exclude<$Trait, Names> {
  const exclusions: Set<string> = new Set(names);
  const newTrait: Record<string, PropertyDescriptor> = {};
  Object.getOwnPropertyNames(trait).forEach((name) => {
    // required properties are not excluded but ignored
    if (!exclusions.has(name) || ("required" in trait[name]! && trait[name]?.required)) {
      newTrait[name] = trait[name]!;
    } else {
      // excluded properties are replaced by required properties
      newTrait[name] = makeRequiredPropDesc(name);
    }
  });

  return Object.freeze(newTrait) as any;
}
