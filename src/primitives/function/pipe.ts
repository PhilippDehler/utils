import { Fn } from "./type";

export function pipe(): () => void;
export function pipe<Arg0, R0>(fn: (arg: Arg0) => R0): (arg: Arg0) => R0;
//prettier-ignore
export function pipe<Arg0, R0, R1>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1): (arg: Arg0) => R1;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2): (arg: Arg0) => R2;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3): (arg: Arg0) => R3;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4): (arg: Arg0) => R4;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4, R5>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4, fn5: (arg: R4) => R5): (arg: Arg0) => R5;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4, R5, R6>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4, fn5: (arg: R4) => R5, fn6: (arg: R5) => R6): (arg: Arg0) => R6;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4, R5, R6, R7>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4, fn5: (arg: R4) => R5, fn6: (arg: R5) => R6, fn7: (arg: R6) => R7): (arg: Arg0) => R7;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4, R5, R6, R7, R8>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4, fn5: (arg: R4) => R5, fn6: (arg: R5) => R6, fn7: (arg: R6) => R7, fn8: (arg: R7) => R8): (arg: Arg0) => R8;
//prettier-ignore
export function pipe<Arg0, R0, R1, R2, R3, R4, R5, R6, R7, R8, R9>(fn0: (arg: Arg0) => R0, fn1: (arg: R0) => R1, fn2: (arg: R1) => R2, fn3: (arg: R2) => R3, fn4: (arg: R3) => R4, fn5: (arg: R4) => R5, fn6: (arg: R5) => R6, fn7: (arg: R6) => R7, fn8: (arg: R7) => R8, fn9: (arg: R8) => R9): (arg: Arg0) => R9;
export function pipe(...fns: Fn[]) {
  return (arg: any) => {
    return fns.reduce((prev, fn) => fn(prev), arg);
  };
}
