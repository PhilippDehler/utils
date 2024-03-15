import { Maybe } from "../ts-utils";

export function isNull<T>(value: Maybe<T>): value is null {
  return value === null;
}
