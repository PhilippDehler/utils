export interface PropertyDescriptorBase<Type = any> extends PropertyDescriptor {
  _type: Type;
}

export interface RequiredPropertyDescriptor<Type> extends PropertyDescriptorBase<Type> {
  required: true;
}

export interface ConflictPropertyDescriptor<Type = never> extends PropertyDescriptorBase<Type> {
  conflict: true;
}

export interface MethodPropertyDescriptor<Type = any> extends PropertyDescriptorBase<Type> {
  method: true;
}
type TraitPropertyDescriptor<Type> =
  | PropertyDescriptorBase<Type>
  | RequiredPropertyDescriptor<Type>
  | ConflictPropertyDescriptor<Type>
  | MethodPropertyDescriptor<Type>;
export function DecorateMethodPropertyDescriptor<T>(pd: TraitPropertyDescriptor<T>): MethodPropertyDescriptor<T> {
  (pd as any).method = true;
  pd.enumerable = false;
  if ("prototype" in pd.value) {
    Object.freeze(pd.value.prototype);
  }
  return pd as any;
}
export function makeRequiredPropDesc<T>(name: string): RequiredPropertyDescriptor<T> {
  return Object.freeze({
    value: undefined,
    enumerable: false,
    required: true,
    _type: null! as T,
  });
}

export function makeConflictingPropDesc(name: string): ConflictPropertyDescriptor {
  const conflict = makeConflictAccessor(name);
  return Object.freeze({
    get: conflict,
    set: conflict,
    enumerable: false,
    conflict: true,
    _type: null! as never,
  });
}

function makeConflictAccessor(name: string) {
  const accessor = function (...args: any[]): never {
    throw new Error("Conflicting property: " + name);
  };
  Object.freeze(accessor.prototype);
  return Object.freeze(accessor);
}

export function getOwnPropertyDescriptor<T, const Name extends PropertyKey>(
  obj: T,
  name: Name,
): Name extends keyof T ? TraitPropertyDescriptor<T[Name]> : TraitPropertyDescriptor<unknown> {
  return Object.getOwnPropertyDescriptor(obj, name) as Name extends keyof T
    ? TraitPropertyDescriptor<T[Name]>
    : TraitPropertyDescriptor<unknown>;
}
// Note: isSameDesc should return true if both
// desc1 and desc2 represent a 'required' property
// (otherwise two composed required properties would be turned into
// a conflict)
export function isSameDesc(desc1: PropertyDescriptor, desc2: PropertyDescriptor): boolean {
  // for conflicting properties, don't compare values because
  // the conflicting property values are never equal
  if ("conflict" in desc1 && desc1.conflict && "conflict" in desc2 && desc2.conflict) {
    return true;
  } else {
    return (
      desc1.get === desc2.get &&
      desc1.set === desc2.set &&
      desc1.value === desc2.value &&
      desc1.enumerable === desc2.enumerable &&
      ("required" in desc1 && desc1.required) === ("required" in desc2 && desc2.required) &&
      ("conflict" in desc1 && desc1.conflict) === ("conflict" in desc2 && desc2.conflict)
    );
  }
}
