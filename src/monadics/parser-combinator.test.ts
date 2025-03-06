import { describe, expect, it } from "vitest";
import { Parser, ParserErrorCode, ParsingState } from "./parser-combinator";

// The two tests marked with concurrent will be started in parallel
describe("Parser Combinator Tests", () => {
  it("should parse a literal value correctly", async () => {
    const cases: {
      literal_setup: [i: string, x?: { case_insensitive: boolean }];
      input: string | ParsingState;
      output: string | null;
    }[] = [
      { literal_setup: ["Hello"], input: "Hello", output: "Hello" },
      { literal_setup: ["hello"], input: "Hello", output: null },
      { literal_setup: ["hello"], input: "hell_o", output: null },
      { literal_setup: ["hello"], input: "hello", output: "hello" },
      { literal_setup: ["hello"], input: "hello world", output: "hello" },
      { literal_setup: ["hello"], input: "world", output: null },
      { literal_setup: ["hello"], input: "world hello", output: null },
      { literal_setup: ["hello"], input: new ParsingState("world hello", 6), output: "hello" },

      {
        literal_setup: ["hello", { case_insensitive: true }],
        input: "hElLo",
        output: "hello",
      },
    ];

    for (const c of cases) {
      const parser = Parser.literal(...c.literal_setup);
      const result = parser.parse(c.input);
      expect.soft(result.type === "failure" ? null : result.data, JSON.stringify(c)).toEqual(c.output);
    }
  });

  it("should parse using a regular expression (multiple examples)", async () => {
    const cases: {
      regex_setup: [i: RegExp];
      input: ParsingState | string;
      output: string | null;
    }[] = [
      { regex_setup: [/^hello/], input: new ParsingState("hello"), output: "hello" },
      { regex_setup: [/^hello/], input: new ParsingState("world hello"), output: null },
      { regex_setup: [/^hello/], input: new ParsingState("world hello", 6), output: "hello" },
      { regex_setup: [/^hello/], input: new ParsingState("world hello", 6), output: "hello" },
    ];

    for (const c of cases) {
      const parser = Parser.regex(...c.regex_setup);
      const result = parser.parse(c.input);
      expect.soft(result.type === "failure" ? null : result.data, JSON.stringify(c)).toEqual(c.output);
    }
    // Just a sanity check call
    Parser.regex(/^hello/).parse("hello");
  });

  it("should transform matched result using map", async () => {
    const parser = Parser.regex(/^\d+/).map((d) => parseInt(d));
    const result = parser.parse("123abc");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(123);
    }
  });

  it("should handle an optional match correctly", async () => {
    const parser = Parser.utf8("a").optional();
    const result1 = parser.parse("a");
    const result2 = parser.parse("b");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("success");
    if (result1.type === "success") {
      expect(result1.data).toBe("a");
    }
    if (result2.type === "success") {
      expect(result2.data).toBe(null);
    }
  });

  it("should parse multiple occurrences using many()", async () => {
    const parser = Parser.utf8("a").many();
    const result = parser.parse("aaab");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toEqual(["a", "a", "a"]);
    }
  });

  it("should parse at least one occurrence using at_least_once()", async () => {
    const parser = Parser.utf8("a")
      .atLeastOnce()
      .map((a) => a.join(""));
    const result1 = parser.parse("aaab");
    const result2 = parser.parse("b");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toBe("aaa");
    }
  });

  it("should parse exactly n occurrences of a token", async () => {
    const parser = Parser.utf8("a").exactly(3);
    const result1 = parser.parse("aaab");
    const result2 = parser.parse("aab");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toEqual(["a", "a", "a"]);
    }
  });

  it("should parse a sequence of tokens", async () => {
    const parser = Parser.sequence(Parser.utf8("a"), Parser.utf8("b"), Parser.utf8("c"));
    const result1 = parser.parse("abc");
    const result2 = parser.parse("ab");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toEqual(["a", "b", "c"]);
    }
  });

  it("should parse alternatives using or()", async () => {
    const parser = Parser.or(Parser.utf8("a"), Parser.utf8("b"));
    const result1 = parser.parse("a");
    const result2 = parser.parse("b");
    const result3 = parser.parse("c");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("success");
    expect(result3.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toBe("a");
    }
    if (result2.type === "success") {
      expect(result2.data).toBe("b");
    }
  });

  it("should handle recursive grammar structures", async () => {
    type Nested = "0" | ["(", Nested | null, ")"];
    const parser = Parser.recursive<Nested>(
      (): Parser<Nested> =>
        Parser.sequence(Parser.utf8("("), Parser.optional(parser), Parser.utf8(")")).or(Parser.utf8("0")),
    );
    const result1 = parser.parse("((0))");
    const result2 = parser.parse("(()");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toEqual(["(", ["(", "0", ")"], ")"]);
    }
  });

  it("should parse digits from the start of string using regex", async () => {
    const parser = Parser.regex(/^\d+/);
    const result1 = parser.parse("123abc");
    const result2 = parser.parse("abc123");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toBe("123");
    }
  });

  it("should parse a single UTF-8 character correctly", async () => {
    const parser = Parser.utf8("a");
    const result1 = parser.parse("abc");
    const result2 = parser.parse("bca");
    expect(result1.type).toBe("success");
    expect(result2.type).toBe("failure");
    if (result1.type === "success") {
      expect(result1.data).toBe("a");
    }
  });
});

describe("Parser Combinator - Edge Case Tests", () => {
  it("should fail when given an empty string for a literal parser", async () => {
    const parser = Parser.literal("hello");
    const result = parser.parse("");
    expect(result.type).toBe("failure");
  });
  it("failing literal should rollback", async () => {
    const state = new ParsingState("world");
    const parser = Parser.literal("hello");
    const result = parser.parse(state);
    expect(result.type).toBe("failure");
    expect(state.currentPosition).toBe(0);
  });

  it("should succeed with an empty match when using optional on empty string", async () => {
    // "optional" means the parser can match or return null if it doesn't match
    const parser = Parser.literal("hello").optional();
    const result = parser.parse("");
    // optional() on empty string -> success but the data = null
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(null);
    }
  });

  it("should fail if we expect progression but get none (sequence expecting a char, but input is empty)", async () => {
    const parser = Parser.sequence(Parser.utf8("a"), Parser.utf8("b"));
    const result = parser.parse("");
    expect(result.type).toBe("failure");
  });

  it("should fail if regex expects at least one character, but input is empty", async () => {
    const parser = Parser.regex(/^.+/);
    const result = parser.parse("");
    expect(result.type).toBe("failure");
  });

  it("should match zero-length regex on empty input if allowed", async () => {
    // This regex uses ^ to match the start and $ to match the end
    // i.e. it matches an empty string
    const parser = Parser.regex(/^$/);
    const result = parser.parse("");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("");
    }
  });

  it("should handle no progression for 'many' with empty string", async () => {
    // many() means 'zero or more occurrences' of the pattern, so
    // with an empty string, it should succeed with an empty array
    const parser = Parser.utf8("a").many();
    const result = parser.parse("");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toEqual([]); // no "a" found
    }
  });

  it("should handle no progression for 'at_least_once' with empty string", async () => {
    // at_least_once() means 'one or more occurrences' of the pattern, so
    // with an empty string, it must fail
    const parser = Parser.utf8("a").atLeastOnce();
    const result = parser.parse("");
    expect(result.type).toBe("failure");
  });

  it("should handle no progression for 'exactly(0)' with empty string", async () => {
    // exactly(0) means we want zero matches of "a" specifically
    // so, an empty string should succeed and parse to []
    const parser = Parser.utf8("a").exactly(0);
    const result = parser.parse("");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toEqual([]);
    }
  });

  it("should fail if 'exactly(1)' sees an empty string", async () => {
    // exactly(1) means we want exactly one "a"
    const parser = Parser.utf8("a").exactly(1);
    const result = parser.parse("");
    expect(result.type).toBe("failure");
  });
});

describe("Parser Combinator - New Functionality Tests", () => {
  /* ------------------------------------------------------------------
   * 1) debug() Tests
   * ------------------------------------------------------------------ */
  it("debug() - should log debug information (normal test)", () => {
    // We won't "see" console output in automated tests, but we can ensure no errors are thrown.
    // Here we'll just parse a simple literal with a debug wrapper.
    const parser = Parser.debug(Parser.literal("hello"), "DebugLiteral");
    const result = parser.parse("hello world");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("hello");
      expect(result.meta.start).toBe(0);
      expect(result.meta.end).toBe(5);
    }
  });

  /* ------------------------------------------------------------------
   * 2) peek() Tests
   * ------------------------------------------------------------------ */
  it("peek() - should not consume input on success", () => {
    const peekParser = Parser.peek(Parser.literal("hello"));

    // Even though we match "hello", we do NOT advance the position.
    // So the next parse of `literal("hello")` should succeed again.
    const input = new ParsingState("hello world");
    const inital_state = input.copy();
    const result1 = peekParser.parse(input);
    expect(result1.type).toBe("success");
    if (result1.type === "success") {
      // "end" should be the same as "start" because peek doesn't advance
      expect(input.copy()).toMatchObject(inital_state);
    }

    const result2 = Parser.literal("hello").parse("hello world");
    expect(result2.type).toBe("success");
    if (result2.type === "success") {
      expect(result2.data).toBe("hello");
    }
  });

  it("peek() - should fail normally if parser fails", () => {
    const peekParser = Parser.peek(Parser.literal("hello"));
    const result = peekParser.parse("goodbye");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      expect(result.code).toBe(ParserErrorCode.EXPECTED_LITERAL);
    }
  });

  /* ------------------------------------------------------------------
   * 3) take_while() Tests
   * ------------------------------------------------------------------ */
  it("take_while() - should consume letters until non-letter encountered", () => {
    const letters = Parser.takeWhile((c) => /[a-zA-Z]/.test(c));
    const result = letters.parse("Hello123");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("Hello");
      expect(result.meta.start).toBe(0);
      expect(result.meta.end).toBe(5);
    }
  });

  it("take_while() - should handle empty consumption gracefully", () => {
    const letters = Parser.takeWhile((c) => /[a-zA-Z]/.test(c));
    const result = letters.parse("1234");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      // no letters at the start => empty string
      expect(result.data).toBe("");
      expect(result.meta.start).toBe(0);
      expect(result.meta.end).toBe(0);
    }
  });

  /* ------------------------------------------------------------------
   * 4) take_until() Tests
   * ------------------------------------------------------------------ */
  it("take_until() - should consume until delimiter character is found", () => {
    const untilComma = Parser.takeUntil((c) => c === ",");
    const result = untilComma.parse("Hello,World!");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("Hello");
      expect(result.meta.start).toBe(0);
      expect(result.meta.end).toBe(5);
    }
  });

  it("take_until() - should consume entire input if delimiter is not found", () => {
    const untilX = Parser.takeUntil((c) => c === "x");
    const result = untilX.parse("abcdef");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("abcdef");
      expect(result.meta.end).toBe(6);
    }
  });

  /* ------------------------------------------------------------------
   * 5) sep_by() Tests
   * ------------------------------------------------------------------ */
  it("sep_by() - should parse comma-separated integers", () => {
    const comma = Parser.literal(",");
    const integerParser = Parser.digits.map(Number);
    const csvParser = Parser.sepBy(integerParser, comma);

    const result = csvParser.parse("10,20,30");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      // Using PC.number -> parseInt
      expect(result.data).toEqual([10, 20, 30]);
    }
  });

  it("sep_by() - should return empty array on empty input (normal approach)", () => {
    const comma = Parser.literal(",");
    const integerParser = Parser.number;
    const csvParser = Parser.sepBy(integerParser, comma);

    const result = csvParser.parse("");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toEqual([]);
    }
  });

  it("sep_by() - should fail if delimiter found but no item after it", () => {
    const comma = Parser.literal(",");
    const integerParser = Parser.number;
    const csvParser = Parser.sepBy(integerParser, comma);

    // "10," => we have a trailing comma with no integer after
    const result = csvParser.parse("10,");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      // Likely code is "EXPECTED_REGEX" or "EXPECTED_LITERAL"
      // depending on how 'number' fails
      expect(result.code).toBe(ParserErrorCode.ALL_PARSERS_FAILED);
      // or possibly "EXPECTED_REGEX" if that’s the immediate cause
    }
  });

  /* ------------------------------------------------------------------
   * 6) skip_until_recovery() Tests
   * ------------------------------------------------------------------ */
  // Let's define a small 'statement' parser that expects "hello"
  // then a delimiter. We'll demonstrate skipping until a semicolon
  // on failure.

  const statementParser = Parser.sequence(Parser.literal("hello"), Parser.literal(";")).map((arr) => arr.join(""));

  const skipUntilSemicolon = (base: Parser<string>) => Parser.skipUntilRecovery(base, Parser.literal(";"));

  it("skip_until_recovery() - normal success (no need to skip)", () => {
    const parser = skipUntilSemicolon(statementParser);
    const result = parser.parse("hello;");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe("hello;");
    }
  });

  it("skip_until_recovery() - advanced skipping scenario", () => {
    const parser = skipUntilSemicolon(statementParser);
    // Input misses 'hello' => we skip until we see semicolon
    // "xxx;" => skip => then we attempt parse again => "hello;"
    const result = parser.parse("xxx;hello;");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      // The skip_until_recovery logic attempts the parser at the found semicolon,
      // then sees "hello;" => success
      expect(result.data).toBe("hello;");
    }
  });

  it("skip_until_recovery() - if no recovery token found, fails with original error", () => {
    const parser = skipUntilSemicolon(statementParser);
    // We never provide a semicolon, so can't recover.
    const result = parser.parse("xxx");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      // This should reflect the original statementParser's failure.
      expect(result.code).toBe(ParserErrorCode.EXPECTED_LITERAL);
      // Or "ALL_PARSERS_FAILED", depending on how your statement parser fails
    }
  });

  /* ------------------------------------------------------------------
   * 7) Custom Error Code Tests
   * ------------------------------------------------------------------ */
  it("should return an EXPECTED_LITERAL error code when literal fails", () => {
    const parser = Parser.literal("hello");
    const result = parser.parse("world");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      expect(result.code).toBe(ParserErrorCode.EXPECTED_LITERAL);
      expect(result.error_message).toContain("Expected literal");
    }
  });

  it("should return an EXPECTED_REGEX error code when regex fails", () => {
    const parser = Parser.regex(/^abc/);
    const result = parser.parse("xyz");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      expect(result.code).toBe(ParserErrorCode.EXPECTED_REGEX);
      expect(result.error_message).toContain("Expected to match regex");
    }
  });

  it("should return UNEXPECTED_EOF when we run out of input", () => {
    const parser = Parser.utf8("h");
    const result = parser.parse(new ParsingState("")); // or parse("") if your logic checks length
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      expect(result.code).toBe(ParserErrorCode.UNEXPECTED_EOF);
      expect(result.error_message).toContain("Unexpected EOF");
    }
  });

  it("should return ALL_PARSERS_FAILED when or() fails all options", () => {
    const parser = Parser.or(Parser.literal("foo"), Parser.literal("bar"));
    const result = parser.parse("baz");
    expect(result.type).toBe("failure");
    if (result.type === "failure") {
      expect(result.code).toBe(ParserErrorCode.ALL_PARSERS_FAILED);
      expect(result.error_message).toBe("All parsers failed");
    }
  });
});

/**
 * This parser recognizes expressions like:
 *
 *   1 + 2
 *   (2 + 3) * 4
 *   10 / 2 + 7
 *   5 - (3 + 2 * 2)
 *   etc.
 *
 * Grammar (roughly):
 *   expression -> term   (('+' | '-') term)*
 *   term       -> factor (('*' | '/') factor)*
 *   factor     -> number | '(' expression ')'
 */
export const math_expression: Parser<number> = Parser.recursive<number>(() => {
  // A factor is either a parenthesized expression or a number.
  const factor = Parser.recursive<number>(
    () =>
      // parenthesized expression: "(" expression ")"
      Parser.sequence(Parser.utf8("("), math_expression, Parser.utf8(")"))
        .map(
          ([, expr]) => expr, // ignore the parentheses
        )
        .or(Parser.number),
    // or just a number (you already have PC.number)
  );

  const sign = Parser.or(Parser.utf8("+"), Parser.utf8("-"));
  const mul_div_sign = Parser.or(Parser.utf8("*"), Parser.utf8("/"));

  // A term is a factor, optionally followed by any number of
  // (* factor) or (/ factor)
  const term = Parser.sequence(
    factor,
    Parser.many(
      Parser.sequence(mul_div_sign, factor).map(([op, val]) => ({
        op,
        val,
      })),
    ),
  ).map(([firstFactor, rest]) => {
    let result = firstFactor;
    for (const { op, val } of rest) {
      if (op === "*") {
        result *= val;
      } else {
        result /= val;
      }
    }
    return result;
  });

  // An expression is a term, optionally followed by any number of
  // (+ term) or (- term)
  return Parser.sequence(term, Parser.many(Parser.sequence(sign, term).map(([op, val]) => ({ op, val })))).map(
    ([firstTerm, rest]) => {
      let result = firstTerm;
      for (const { op, val } of rest) {
        if (op === "+") {
          result += val;
        } else {
          result -= val;
        }
      }
      return result;
    },
  );
});

describe("Math Expression Parser", () => {
  it("should parse a simple addition", () => {
    const result = math_expression.parse("1+2");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(3); // 1 + 2 = 3
    }
  });

  it("should parse a subtraction", () => {
    const result = math_expression.parse("5-2");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(3); // 5 - 2 = 3
    }
  });

  it("should handle multiplication before addition", () => {
    const result = math_expression.parse("2+3*4");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(14); // 3*4=12 => 2+12=14
    }
  });

  it("should handle parentheses overriding precedence", () => {
    const result = math_expression.parse("(2+3)*4");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(20); // (2+3)=5 => 5*4=20
    }
  });

  it("should parse multiple operations in sequence", () => {
    const result = math_expression.parse("10-2+3");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(11); // 10-2=8 => 8+3=11
    }
  });

  it("should handle integer division and multiplication in sequence", () => {
    const result = math_expression.parse("10/2*3");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(15); // 10/2=5 => 5*3=15
    }
  });

  it("should handle nested parentheses", () => {
    const result = math_expression.parse("10-(2+3)*4");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(-10); // (2+3)=5 => 5*4=20 => 10-20= -10
    }
  });

  it("should handle nested parentheses with multiplication", () => {
    const result = math_expression.parse("5-(3+1*(2+3)*5)");
    expect(result.type).toBe("success");
    if (result.type === "success") {
      expect(result.data).toBe(-23); // (2+3)=5 => 1*5=5 => 5*5=25 => 3+25=28 => 5-28=-23
    }
  });
});
