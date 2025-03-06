import { use_debug } from "../debugging/logger";
import { Enum, InferEnum } from "../enum";
import { isDefined } from "../guards/isDefined";

export const ParserErrorCode = Enum.fromObject({
  EXPECTED_LITERAL: "EXPECTED_LITERAL",
  EXPECTED_REGEX: "EXPECTED_REGEX",
  UNEXPECTED_EOF: "UNEXPECTED_EOF",
  ALL_PARSERS_FAILED: "ALL_PARSERS_FAILED",
});
export type ParserErrorCode = InferEnum<typeof ParserErrorCode>;

interface Meta {
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface Success<T> {
  type: "success";
  meta: Meta;
  data: T;
}

function success<T>(data: T, meta: Meta): Success<T> {
  return { type: "success", meta, data };
}

type State = {
  currentPosition: number;
  currentLine: number;
  currentColumn: number;
};

export class ParsingState {
  constructor(
    public raw: string = "",
    public currentPosition: number = 0,
    public currentLine: number = 1,
    public currentColumn: number = 1,
  ) {}

  rollback(state: State) {
    this.currentLine = state.currentLine;
    this.currentColumn = state.currentColumn;
    this.currentPosition = state.currentPosition;
    return null;
  }

  stateTransaction(mode: "auto-commit" | "auto-rollback" = "auto-rollback") {
    let initalState: State = this.copy();
    const trx = {
      is_dirty: () => {
        return this.currentPosition !== initalState.currentPosition;
      },
      peek: () => {
        return this.raw[this.currentPosition];
      },
      peekRemainder: () => {
        return this.raw.slice(this.currentPosition);
      },
      nextChars: (n: number): string => {
        return this.nextChars(n);
      },
      nextChar: () => {
        return this.nextChar();
      },
      success: <T>(match: T) => {
        const result = success(match, trx.meta());
        trx.commit();
        return result;
      },
      failure: (code: ParserErrorCode, error_message: string) => {
        const result = failure(code, error_message, trx.meta());
        trx.rollback();
        return result;
      },
      rollback: () => {
        if (!trx.is_dirty) return;
        this.rollback(initalState);
      },
      commit: () => {
        if (!trx.is_dirty) return;
        initalState = this.copy();
        return;
      },
      meta: () => {
        if (initalState === null) throw new Error("Cannot rollback after a failure");
        return this.meta(initalState);
      },
      [Symbol.dispose]: () => {
        mode === "auto-rollback" ? trx.rollback() : trx.commit();
      },
    };

    return trx;
  }

  meta(initalState: State): Meta {
    return {
      start: initalState.currentPosition,
      end: this.currentPosition,
      endColumn: this.currentColumn,
      endLine: this.currentLine,
      startColumn: initalState.currentColumn,
      startLine: initalState.currentLine,
    };
  }
  nextChar() {
    const current = this.raw[this.currentPosition];
    this.currentPosition++;
    if (current === "\n") {
      this.currentLine++;
      this.currentColumn = 1;
    } else this.currentColumn++;
    return current;
  }

  nextChars(n: number): string {
    let sub = "";
    for (let i = 0; i < n; i++) {
      sub += this.nextChar();
    }
    return sub;
  }
  copy(): State {
    return {
      currentPosition: this.currentPosition,
      currentLine: this.currentLine,
      currentColumn: this.currentColumn,
    };
  }
}

interface Failure {
  type: "failure";
  code: ParserErrorCode;
  meta: Meta;
  error_message: string;
}
function failure(code: ParserErrorCode, error_message: string, meta_info: Meta): Failure {
  return { type: "failure", code, error_message, meta: meta_info };
}

type Result<T> = Success<T> | Failure;

export class Parser<T> {
  public parse: (ctx?: ParsingState | string) => Result<T>;
  constructor(_parse: (ctx: ParsingState) => Result<T>) {
    this.parse = (input: ParsingState | string = new ParsingState()) => {
      const ctx = typeof input === "string" ? new ParsingState(input) : input;
      if (ctx.raw.length < ctx.currentPosition) {
        return failure(ParserErrorCode.UNEXPECTED_EOF, `Unexpected EOF`, ctx.meta(ctx));
      }
      return _parse(ctx);
    };
  }

  map<A>(cb: (v: T) => A): Parser<A> {
    return Parser.map(this, cb);
  }
  static map = function map<TIn, TOut>(parser: Parser<TIn>, transform: (parser_result: TIn) => TOut): Parser<TOut> {
    return new Parser((ctx) => {
      const parsed = parser.parse(ctx);
      if (parsed.type === "failure") return parsed;
      return success(transform(parsed.data), parsed.meta);
    });
  };

  optional(): Parser<T | null> {
    return Parser.optional(this);
  }
  static optional = function optional<T>(parser: Parser<T>): Parser<T | null> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction("auto-commit");
      const parsed = parser.parse(ctx);
      if (parsed.type === "failure") return trx.success(null);
      return parsed;
    });
  };

  many(): Parser<T[]> {
    return Parser.many(this);
  }
  static many = function many<T>(parser: Parser<T>): Parser<T[]> {
    return new Parser((ctx) => {
      const trx = ctx.stateTransaction();
      const data = [];
      while (true) {
        const result = parser.parse(ctx);
        if (result.type === "failure" || !trx.is_dirty()) {
          return trx.success(data);
        } else {
          data.push(result.data);
        }
      }
    });
  };

  atLeastOnce(): Parser<[T, ...T[]]> {
    return Parser.atLeastOnce(this);
  }

  static atLeastOnce = function atLeastOnce<T>(parser: Parser<T>): Parser<[T, ...T[]]> {
    return new Parser((ctx) => {
      const result = parser.parse(ctx);
      if (result.type === "failure") return result;

      using trx = ctx.stateTransaction("auto-commit");
      const data: [T, ...T[]] = [result.data];
      while (true) {
        const current_result = parser.parse(ctx);
        if (current_result.type === "failure" || !trx.is_dirty()) return trx.success(data);
        data.push(current_result.data);
      }
    });
  };

  exactly(count: number): Parser<T[]> {
    return Parser.exactly(this, count);
  }
  static exactly = function exactly<T>(parser: Parser<T>, count: number): Parser<T[]> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction("auto-rollback");
      const data: T[] = [];
      for (let i = 0; i < count; i++) {
        const result = parser.parse(ctx);
        if (result.type === "failure") return result;
        data.push(result.data);
      }
      return trx.success(data);
    });
  };

  static sequence = function sequence<const P extends Parser<any>[]>(...parsers: P): Parser<InferSequenceParts<P>> {
    return new Parser((state) => {
      const sequence_result = [] as InferSequenceParts<P>;
      using trx = state.stateTransaction("auto-rollback");
      for (const parser of parsers) {
        const result = parser.parse(state);
        if (result.type === "failure") return result;
        sequence_result.push(result.data as never);
      }
      return trx.success(sequence_result);
    });
  };
  andThen<const P extends Parser<any>[]>(...p: P) {
    return Parser.sequence<[this, ...P]>(this, ...p);
  }

  static or = function or<const A extends Parser<any>[]>(...parsers: A): Parser<InferSequenceParts<A>[number]> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction("auto-commit");
      for (const parser of parsers) {
        const result = parser.parse(ctx);
        if (result.type === "success") return result;
      }
      return trx.failure(ParserErrorCode.ALL_PARSERS_FAILED, "All parsers failed");
    });
  };
  or<const A extends Parser<any>[]>(...parsers: A) {
    return Parser.or(this, ...parsers);
  }

  static utf8 = function utf8<const E extends string>(expected: E): Parser<E> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      const next_char = trx.nextChar();
      if (next_char === undefined && expected !== "") {
        return trx.failure(ParserErrorCode.UNEXPECTED_EOF, "Unexpected EOF");
      }
      if (next_char !== expected) {
        return trx.failure(ParserErrorCode.EXPECTED_LITERAL, `Expected character: ${expected}`);
      }
      return trx.success(expected);
    });
  };

  static regex = function regex(pattern: RegExp): Parser<string> {
    if (!pattern.source.startsWith("^")) {
      throw new Error("Regex pattern must start with ^");
    }
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      const match = trx.peekRemainder().match(pattern);
      if (!match) {
        return trx.failure(ParserErrorCode.EXPECTED_REGEX, `Expected to match regex: ${pattern}`);
      }
      return trx.success(trx.nextChars(match[0].length));
    });
  };
  static literal = function literal<const L extends string>(
    expected: L,
    config?: { case_insensitive: boolean },
  ): Parser<L> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      const case_insensitive = config?.case_insensitive ?? false;
      let prepared_input = trx.nextChars(expected.length);
      let prepared_expected: string = expected;
      if (case_insensitive) {
        prepared_input = prepared_input.toLowerCase();
        prepared_expected = prepared_expected.toLowerCase();
      }
      if (prepared_input === prepared_expected) return trx.success(expected);

      return trx.failure(ParserErrorCode.EXPECTED_LITERAL, `Expected literal: "${expected}"`);
    });
  };

  /**
   * Parse zero or more items separated by a delimiter.
   * If you want one or more, you can combine it with at_least_once, etc.
   *
   * @param item_parser      A parser that recognizes an item.
   * @param delimiter_parser A parser that recognizes the delimiter (e.g., comma).
   * @returns A parser that returns an array of all parsed items.
   */
  static sepBy = function sepBy<T>(item_parser: Parser<T>, delimiter_parser: Parser<any>): Parser<T[]> {
    return new Parser((ctx) => {
      const items: T[] = [];
      const first_result = item_parser.parse(ctx);
      if (first_result.type === "failure") {
        // If there's no item at all, we can treat it as success with an empty list (common approach)
        return success(items, first_result.meta);
      }
      items.push(first_result.data);

      using trx = ctx.stateTransaction();
      // parse subsequent items
      while (true) {
        // parse the delimiter
        const parsed_delimiter = delimiter_parser.parse(ctx);
        if (parsed_delimiter.type === "failure") {
          // no more delimiter => no more items
          break;
        }

        const next_item_result = item_parser.parse(ctx);
        if (next_item_result.type === "failure") return next_item_result;
        items.push(next_item_result.data);
      }

      return trx.success(items);
    });
  };

  sepBy(delimiter_parser: Parser<any>) {
    return Parser.sepBy(this, delimiter_parser);
  }

  static peek = function peek<T>(parser: Parser<T>): Parser<T> {
    return new Parser((ctx) => {
      using _ = ctx.stateTransaction();
      const result = parser.parse(ctx);
      _.rollback();
      return result;
    });
  };

  static eof = new Parser((ctx) => {
    using trx = ctx.stateTransaction();
    if (trx.peek() !== undefined) {
      return trx.failure(ParserErrorCode.EXPECTED_LITERAL, "Expected EOF");
    }
    return trx.success(null);
  });

  static nextChar = function any(): Parser<string> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      const char = trx.nextChar();
      if (char === undefined) {
        return trx.failure(ParserErrorCode.UNEXPECTED_EOF, "Unexpected EOF");
      }
      return trx.success(char);
    });
  };

  static skipUntilRecovery = function skip_until_recovery<T>(
    baseParser: Parser<T>,
    recover_until_parser: Parser<any>,
  ): Parser<T | null> {
    return new Parser((ctx) => {
      const initalState = ctx.copy();
      const initialResult = baseParser.parse(ctx);
      if (initialResult.type === "success") return initialResult; // all good

      while (ctx.currentPosition < ctx.raw.length) {
        const recover_check = recover_until_parser.parse(ctx);
        if (recover_check.type === "success") {
          const resumed_result = baseParser.parse(ctx);
          if (resumed_result.type === "success") return resumed_result;

          return success(null, ctx.meta(initalState));
        }
        ctx.nextChar();
      }
      return initialResult;
    });
  };

  skip_until_recovery(recover_until_parser: Parser<any>) {
    return Parser.skipUntilRecovery(this, recover_until_parser);
  }
  /**
   * Returns a new parser that logs debug information before/after parsing.
   *
   * @param label - A string to identify what's being parsed.
   */
  static debug = function debug<T>(parser: Parser<T>, label: string): Parser<T> {
    return new Parser((ctx) => {
      using _debug = use_debug(
        `[DEBUG] Enter ${label} at position ${ctx.currentPosition} col: ${ctx.currentColumn} line: ${ctx.currentLine}`,
      );
      const result = parser.parse(ctx);
      if (result.type === "success") {
        console.log(`[SUCCESS]: ${label} => Data:`, JSON.stringify(result.data, null, 2));
      } else {
        console.log(`[FAILURE]: ${label} => Message:`, result.error_message);
      }
      return result;
    });
  };

  debug(label: string): Parser<T> {
    return Parser.debug(this, label);
  }

  static token = function token<T>(p: Parser<T>): Parser<T> {
    return Parser.sequence(
      Parser.many(Parser.whitespace), // skip leading whitespace
      p,
      Parser.many(Parser.whitespace), // skip trailing whitespace
    ).map((result) => result[1] as T);
  };
  trim() {
    return Parser.token(this);
  }

  trim_left() {
    return Parser.sequence(Parser.many(Parser.whitespace), this).map((r) => r.at(-1) as T);
  }

  static recursive = function recursive<T>(parserThunk: () => Parser<T>): Parser<T> {
    return new Parser((ctx) => {
      const parser = parserThunk();
      return parser.parse(ctx);
    });
  };

  /**
   * Consumes characters from the input while `predicate(char)` returns true.
   *
   * @param predicate - A function that returns true if the character should be consumed.
   * @returns A parser that returns the consumed substring.
   */
  static takeWhile = function takeWhile(predicate: (char: string) => boolean): Parser<string> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      let substring = "";
      while (trx.peek() && predicate(trx.peek()!)) {
        substring += trx.nextChar();
      }
      // If nothing was consumed, it's not necessarily a failure.
      // Some parser libraries treat `takeWhile` as always success, returning the substring (empty or not).
      // If you want it to fail when it can't consume anything, you'd do so conditionally.
      return trx.success(substring);
    });
  };

  /**
   * Consumes characters from the input until `predicate(char)` is true.
   *
   * @param predicate - A function that returns true if consumption should stop (i.e., we found a delimiter).
   * @returns A parser that returns the consumed substring (excluding the stop character).
   */
  static takeUntil = function take_until(predicate: (char: string) => boolean): Parser<string> {
    return new Parser((ctx) => {
      using trx = ctx.stateTransaction();
      let substring = "";
      while (trx.peek() && !predicate(trx.peek()!)) {
        substring += trx.nextChar();
      }
      return trx.success(substring);
    });
  };

  static any = new Parser((ctx) => {
    using trx = ctx.stateTransaction();
    const next = trx.nextChar();
    if (!next) return trx.failure(ParserErrorCode.UNEXPECTED_EOF, "Unexpected eof");
    return trx.success(next);
  });
  static whitespace = Parser.regex(/^\s/);
  static digit = Parser.regex(/^\d/);
  static digits = Parser.regex(/^\d+/);
  static unsinged_integer = Parser.regex(/^[1-9][0-9]*/).map((d) => parseInt(d));
  static integer = Parser.sequence(Parser.utf8("+").or(Parser.utf8("-")).optional(), Parser.unsinged_integer).map((r) =>
    parseInt(r.filter(isDefined).join("")),
  );
  static float = Parser.map(
    Parser.or(
      Parser.sequence(Parser.integer, Parser.utf8("."), Parser.digits.optional()),
      Parser.sequence(Parser.integer.optional(), Parser.utf8("."), Parser.digits),
    ),
    (r) => parseInt(r.filter(isDefined).join("")),
  );
  static number = Parser.or(Parser.float, Parser.integer);
  static letter = Parser.regex(/^[a-zA-Z]/);
  static letters = Parser.regex(/^[a-zA-Z]+/);
}

type InferSequenceParts<T extends Parser<any>[], $agg extends any[] = []> = T extends [
  Parser<infer U>,
  ...infer R extends Parser<any>[],
]
  ? InferSequenceParts<R, [...$agg, U]>
  : $agg;
