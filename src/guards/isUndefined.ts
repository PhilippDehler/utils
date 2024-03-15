import { Maybe } from "../ts-utils";

export function isUndefined<T>(value: Maybe<T>): value is undefined {
  return value === undefined;
}
