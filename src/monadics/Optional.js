"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.None = exports.Some = exports.Optional = void 0;
exports.lift = lift;
class Optional {
    constructor() { }
    static is_none(self) {
        return self instanceof None;
    }
    static is_some(self) {
        return self instanceof Some;
    }
    static is_optional(self) {
        return self instanceof Optional;
    }
    static map(fn) {
        return (val) => val.map(fn);
    }
    map(_) {
        if (Optional.is_some(this))
            return Some.new(_(this.value));
        return None.new();
    }
    static fmap(fn) {
        return (val) => val.fmap(fn);
    }
    fmap(_) {
        if (Optional.is_some(this)) {
            const result = _(this.value);
            if (Optional.is_optional(result))
                return result;
            return Some.new(result);
        }
        return None.new();
    }
    static tap(fn) {
        return (val) => val.tap(fn);
    }
    tap(fn) {
        if (Optional.is_some(this))
            fn(this.value);
        return this;
    }
    unwrap() {
        if (Optional.is_some(this))
            return this.value;
        return null;
    }
    unwrap_or(or) {
        if (Optional.is_some(this))
            return this.value;
        return or();
    }
    unwrap_or_throw(message) {
        if (Optional.is_some(this))
            return this.value;
        throw new Error(message);
    }
    match(_) {
        if (Optional.is_some(this))
            return _.some(this.value);
        return _.none();
    }
    static match(_) {
        return (val) => val.match(_);
    }
    filter(predicate) {
        if (Optional.is_some(this) && predicate(this.value))
            return this;
        return None.new();
    }
    static filter(predicate) {
        return (val) => val.filter(predicate);
    }
    static lift(fn) {
        return (val) => val.map(fn);
    }
    static from_maybe(val) {
        if (val === null || val === undefined)
            return None.new();
        return Some.new(val);
    }
}
exports.Optional = Optional;
/**
 * Lifts a function to operate on Optional values.
 * @template T - The type of the input value.
 * @template C - The type of the output value.
 * @param fn - The function to lift.
 * @returns A lifted function that operates on Optional values.
 */
function lift(fn) {
    return (val) => val.map(fn);
}
class Some extends Optional {
    value;
    constructor(value) {
        super();
        this.value = value;
    }
    static new(value) {
        return new Some(value);
    }
    unwrap() {
        return this.value;
    }
    unwrap_or(_) {
        return this.value;
    }
    unwrap_or_throw(_) {
        return this.value;
    }
}
exports.Some = Some;
class None extends Optional {
    constructor() {
        super();
    }
    static new() {
        return new None();
    }
    unwrap() {
        return null;
    }
    unwrap_or(or) {
        return or();
    }
    unwrap_or_throw(message) {
        throw new Error(message);
    }
}
exports.None = None;
