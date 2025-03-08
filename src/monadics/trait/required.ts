export type RequiredTrait<T> = { key: "<REQUIRED_TRAIT>"; _type: T };
const __required = Object.freeze({ key: "<REQUIRED_TRAIT>" as const, _type: null! as never });
export const required = <T>(): RequiredTrait<T> => __required;

export type RequiredThis<T> = {
  [K in keyof T]: T[K] extends RequiredTrait<any> ? T[K]["_type"] : T[K];
};
export type RequiredOnly<T> = {
  [K in keyof T as T[K] extends RequiredTrait<any> ? K : never]: T[K] extends RequiredTrait<any>
    ? T[K]["_type"]
    : never;
};
