import { Pretty } from "../../ts-utils";
import { makeConflictingPropDesc, makeRequiredPropDesc } from "./property-descriptors";
import { RequiredTrait } from "./required";
import { Trait } from "./trait";

/**
   * var newTrait = rename(map, trait)
   *
   * @param map an object whose own properties serve as a mapping from
            old names to new names.
   * @param trait a trait object
   * @returns a new trait with the same properties as the original trait,
   *          except that all properties whose name is an own property
   *          of map will be renamed to map[name], and a 'required' property
   *          for name will be added instead.
   *
   * rename({a: 'b'}, t) eqv compose(exclude(['a'],t),
   *                                 { a: { required: true },
   *                                   b: t[a] })
   *
   * For each renamed property, a required property is generated.  If
   * the map renames two properties to the same name, a conflict is
   * generated.  If the map renames a property to an existing
   * unrenamed property, a conflict is generated.
   *
   * Note: rename(A, rename(B, t)) is equivalent to rename(\n ->
   * A(B(n)), t) Note: rename({...},exclude([...], t)) is not eqv to
   * exclude([...],rename({...}, t))
   */
/**
 * The Rename<NameMap, Trait> type transforms the property names at the type level,
 * mirroring the logic from your `rename()` function:
 *
 * 1) For each property `K` in Trait:
 *    - If K is in `NameMap` and the descriptor is NOT required:
 *       - Produce a new property at `NameMap[K]` with the original descriptor.
 *       - Replace the original property name K with a "required" placeholder.
 *    - If K is in `NameMap` but the descriptor IS required, leave it at K (no rename).
 *    - If K is NOT in `NameMap`, leave it at K.
 *
 * 2) Note: The runtime code also sets conflicts if two properties map to the same alias;
 *    we do not attempt to model that in the type (since it would require more complex logic).
 */
//prettier-ignore
export type Rename<$nameMap extends Record<string, string>, $trait extends Record<string, unknown>> = Pretty<{
  // Part A: Produce the new alias properties
  [K in keyof $trait as K extends keyof $nameMap ? 
    // If the descriptor is required, we keep it under the same name
                                                    $trait[K] extends RequiredTrait<any> ? K 
    // If not required, we rename it => so the original becomes a required placeholder
                                                                                         : $nameMap[K] 
                                                : K]: $trait[K]
} & {
  // Part B: Produce required
  [K in keyof $trait as K extends keyof $nameMap ? $trait[K] extends RequiredTrait<any> ? never : K : never]: RequiredTrait<$trait[K]>;
}>;

export function rename<const $nameMap extends Record<string, string>, $proto extends Record<string, unknown>>(
  map: $nameMap,
  trait: Trait<$proto>,
): Trait<Rename<$nameMap, $proto>> {
  const renamedTrait: Record<string, PropertyDescriptor & { required?: boolean }> = {};
  Object.getOwnPropertyNames(trait).forEach((name) => {
    // required props are never renamed
    if (map.hasOwnProperty(name) && !("required" in trait[name]! && trait[name]?.required)) {
      const alias = map[name]!; // alias defined in map
      if (renamedTrait.hasOwnProperty(alias) && !renamedTrait[alias]?.required) {
        // could happen if 2 props are mapped to the same alias
        renamedTrait[alias] = makeConflictingPropDesc(alias);
      } else {
        // add the property under an alias
        renamedTrait[alias] = trait[name]!;
      }
      // add a required property under the original name
      // but only if a property under the original name does not exist
      // such a prop could exist if an earlier prop in the trait was
      // previously aliased to this name
      if (!renamedTrait.hasOwnProperty(name)) {
        renamedTrait[name] = makeRequiredPropDesc(name);
      }
    } else {
      // no alias defined
      if (renamedTrait.hasOwnProperty(name)) {
        // could happen if another prop was previously aliased to name
        if (!("required" in trait[name]! && trait[name]?.required)) {
          renamedTrait[name] = makeConflictingPropDesc(name);
        }
        // else required property overridden by a previously aliased
        // property and otherwise ignored
      } else {
        renamedTrait[name] = trait[name]!;
      }
    }
  });

  return Object.freeze(renamedTrait) as Trait<Rename<$nameMap, $proto>>;
}
