import { None, Optional, Some } from "../monadics/Optional";

export class List<T> {
  items: T[] = [];
  set_items(items: T[]) {
    this.items = [...items];
    return this;
  }
  static new<T>(items: T[]) {
    return new List<T>().set_items(items);
  }

  static empty<T>() {
    return new List<T>();
  }
  static from_array<T>(items: T[]) {
    return List.empty<T>().set_items(items);
  }

  $push(...item: T[]): number {
    return this.items.push(...item);
  }
  $concat(item: T) {
    this.items.push(item);
    return this;
  }

  $map<U>(callback: (item: T, index: number) => U) {
    return List.$map(callback)(this);
  }
  map<U>(callback: (item: T, index: number) => U) {
    return List.$map(callback)(List.from_array(this.items));
  }
  static map<T, U>(callback: (item: T, index: number) => U) {
    return function <L extends T>(list: List<L>): List<U> {
      return List.$map(callback)(List.from_array(list.items));
    };
  }
  static $map<T, U>(callback: (item: T, index: number) => U) {
    return function <L extends T>(list: List<L>): List<U> {
      for (let i = 0; i < list.items.length; i++) {
        (list.items[i] as any) = callback(list.items[i]!, i);
      }
      return list as any as List<U>;
    };
  }

  $filter(predicate: (item: T, index: number) => boolean) {
    return List.$filter(predicate)(this);
  }
  filter(predicate: (item: T, index: number) => boolean): List<T> {
    return List.filter(predicate)(this);
  }
  static filter<T>(predicate: (item: T, index: number) => boolean) {
    return function (list: List<T>): List<T> {
      return List.$filter(predicate)(List.from_array(list.items));
    };
  }
  static $filter<T>(predicate: (item: T, index: number) => boolean) {
    return function (list: List<T>): List<T> {
      for (let i = 0; i < list.items.length; i++) {
        if (!predicate(list.items[i]!, i)) continue;
        list.items.splice(i--, 1);
      }
      return list;
    };
  }

  static $reverse<T>(list: List<T>): List<T> {
    for (let i = 0; i < list.items.length; i++) {
      list.items.unshift(list.items.pop()!);
    }
    return list;
  }
  static reverse<T>(list: List<T>): List<T> {
    return List.from_array(list.items).$reverse();
  }
  $reverse() {
    return List.$reverse(this);
  }
  reverse() {
    return List.reverse(this);
  }

  all(predicate: (item: T, index: number) => boolean) {
    return List.all(predicate)(this);
  }
  static all<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): boolean {
      for (let index = 0; index < list.items.length; index++) {
        if (!predicate(list.items[index]!, index)) return false;
      }
      return true;
    };
  }

  find(predicate: (item: T, index: number) => boolean): Optional<T> {
    return List.find(predicate)(this);
  }
  static find<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): Optional<L> {
      for (let index = 0; index < list.items.length; index++) {
        if (predicate(list.items[index]!, index)) return Some.new(list.items[index]!);
      }
      return None.new();
    };
  }

  slice(start: number, end: number) {
    return List.slice(start, end)(this);
  }
  static slice<T>(start: number, end: number) {
    return function <L extends T>(list: List<L>): List<T> {
      const sliced = List.empty<T>();
      for (let index = start; index < Math.min(list.items.length, end); index++) {
        sliced.$push(list.items[index]!);
      }
      return sliced;
    };
  }

  head() {
    return List.head(this);
  }
  static head<T>(list: List<T>): Optional<T> {
    return List.at(0)(list);
  }
  tail() {
    return List.tail(this);
  }
  static tail<T>(list: List<T>): List<T> {
    return List.from_array(list.items.slice(1));
  }
  last() {
    return Optional.from_maybe(this.items[this.items.length - 1]);
  }
  static last<T>(list: List<T>): Optional<T> {
    return List.at(list.items.length - 1)(list);
  }

  init() {
    return Optional.from_maybe(this.items.slice(0, this.items.length - 1));
  }
  static init<T>(list: List<T>): List<T> {
    return List.from_array(list.items.slice(0, list.items.length - 1));
  }

  fold<Agg>(callback: (aggregator: Agg, item: T, index: number) => Agg, agg: Agg) {
    return List.fold(callback, agg)(this);
  }
  static fold<T, Agg>(callback: (aggregator: Agg, item: T, index: number) => Agg, agg: Agg) {
    return function <L extends T>(list: List<L>): Agg {
      let aggregated_value = agg;
      for (let index = 0; index < list.items.length; index++) {
        aggregated_value = callback(aggregated_value, list.items[index]!, index);
      }
      return aggregated_value;
    };
  }

  at(index: number) {
    return Optional.from_maybe(this.items[index]);
  }
  static at(index: number) {
    return function <T>(list: List<T>): Optional<T> {
      return Optional.from_maybe(list.items[index]);
    };
  }

  length() {
    return List.length(this);
  }
  static length<T>(list: List<T>) {
    return list.items.length;
  }

  fmap<U>(callback: (item: T, index: number) => List<U> | U) {
    return List.fmap(callback)(this);
  }
  static fmap<T, U>(callback: (item: T, index: number) => List<U> | U) {
    return function <L extends T>(list: List<L>): List<U> {
      const res = List.empty<U>();
      for (let index = 0; index < list.items.length; index++) {
        const result = callback(list.items[index]!, index);
        if (result instanceof List) res.$push(...result.items);
        else res.$push(result);
      }
      return res;
    };
  }

  values() {
    return this.items.values();
  }
}
