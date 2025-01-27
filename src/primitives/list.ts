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
    for (let i = 0; i < this.items.length; i++) {
      (this.items[i] as any) = callback(this.items[i]!, i);
    }
    return this as any as List<U>;
  }
  map<U>(callback: (item: T, index: number) => U) {
    return List.from_array(this.items).$map(callback);
  }
  static map<T, U>(callback: (item: T, index: number) => U) {
    return function <L extends T>(list: List<L>): List<U> {
      return list.map(callback);
    };
  }
  static $map<T, U>(callback: (item: T, index: number) => U) {
    return function <L extends T>(list: List<L>): List<U> {
      return list.$map(callback);
    };
  }
  $filter(predicate: (item: T, index: number) => boolean) {
    for (let i = 0; i < this.items.length; i++) {
      if (!predicate(this.items[i]!, i)) continue;
      this.items.splice(i--, 1);
    }
    return this;
  }
  filter(predicate: (item: T, index: number) => boolean): List<T> {
    return List.from_array(this.items).$filter(predicate);
  }
  static filter<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): List<L> {
      return list.filter(predicate);
    };
  }

  static $filter<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): List<T> {
      return list.$filter(predicate);
    };
  }
  $reverse() {
    for (let i = 0; i < this.items.length; i++) {
      this.items.unshift(this.items.pop()!);
    }
    return this;
  }
  reverse() {
    return List.from_array(this.items).$reverse();
  }
  static reverse<T>() {
    return function <L extends T>(list: List<L>): List<L> {
      return list.reverse();
    };
  }

  static $reverse<T>() {
    return function <L extends T>(list: List<L>): List<T> {
      return list.$reverse();
    };
  }

  all(predicate: (item: T, index: number) => boolean) {
    for (let index = 0; index < this.items.length; index++) {
      if (!predicate(this.items[index]!, index)) return false;
    }
    return true;
  }
  static all<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): boolean {
      return list.all(predicate);
    };
  }

  find(predicate: (item: T, index: number) => boolean): Optional<T> {
    for (let index = 0; index < this.items.length; index++) {
      if (predicate(this.items[index]!, index))
        return Some.new(this.items[index]!);
    }
    return None.new();
  }
  static find<T>(predicate: (item: T, index: number) => boolean) {
    return function <L extends T>(list: List<L>): Optional<L> {
      return list.find(predicate);
    };
  }
  slice(start: number, end: number) {
    const sliced = List.empty<T>();
    for (let index = start; index < Math.min(this.items.length, end); index++) {
      sliced.$push(this.items[index]!);
    }
    return sliced;
  }
  static slice<T>(start: number, end: number) {
    return function <L extends T>(list: List<L>): List<T> {
      return list.slice(start, end);
    };
  }

  head() {
    return Optional.from_maybe(this.items[0]);
  }
  static head<T>() {
    return function <L extends T>(list: List<L>): Optional<T> {
      return list.head();
    };
  }
  tail() {
    return Optional.from_maybe(this.items.slice(1));
  }
  static tail<T>() {
    return function <L extends T>(list: List<L>): Optional<T[]> {
      return list.tail();
    };
  }
  last() {
    return Optional.from_maybe(this.items[this.items.length - 1]);
  }
  static last<T>() {
    return function <L extends T>(list: List<L>): Optional<T> {
      return list.last();
    };
  }
  init() {
    return Optional.from_maybe(this.items.slice(0, this.items.length - 1));
  }
  static init<T>() {
    return function <L extends T>(list: List<L>): Optional<T[]> {
      return list.init();
    };
  }

  fold<Agg>(
    callback: (aggregator: Agg, item: T, index: number) => Agg,
    agg: Agg
  ) {
    let aggregated_value = agg;
    for (let index = 0; index < this.items.length; index++) {
      aggregated_value = callback(aggregated_value, this.items[index]!, index);
    }
    return aggregated_value;
  }
  static fold<T, Agg>(
    callback: (aggregator: Agg, item: T, index: number) => Agg
  ) {
    return function (agg: Agg) {
      return function <L extends T>(list: List<L>): Agg {
        return list.fold(callback, agg);
      };
    };
  }

  at(index: number) {
    return Optional.from_maybe(this.items[index]);
  }
  static at<T>(index: number) {
    return function <L extends T>(list: List<L>): Optional<T> {
      return list.at(index);
    };
  }

  length() {
    return this.items.length;
  }
  static length<T>() {
    return function <L extends T>(list: List<L>): number {
      return list.length();
    };
  }

  fmap<U>(callback: (item: T, index: number) => List<U> | U) {
    const res = List.empty<U>();
    for (let index = 0; index < this.items.length; index++) {
      const result = callback(this.items[index]!, index);
      if (result instanceof List) res.$push(...result.items);
      else res.$push(result);
    }
    return res;
  }
  static fmap<T, U>(callback: (item: T, index: number) => List<U> | U) {
    return function <L extends T>(list: List<L>): List<U> {
      return list.fmap(callback);
    };
  }

  values() {
    return this.items.values();
  }
}
