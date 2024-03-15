import { Maybe } from "../ts-utils";

export function isNil<T>(value: Maybe<T>): value is null | undefined {
  return value === null || value === undefined;
}
