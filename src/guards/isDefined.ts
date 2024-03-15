import { Maybe } from "../ts-utils";

export function isDefined<T>(value: Maybe<T>): value is T & {} {
  return value !== undefined && value !== null;
}
