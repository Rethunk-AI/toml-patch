import { tokenize } from "../tokenizer";
import { example } from "../__fixtures__";

test("should tokenize simple input", () => {
	expect([...tokenize(`a = "b"`)]).toMatchSnapshot();
});

test("should tokenize multiline strings", () => {
	expect([
		...tokenize(`
    a = "b"
    c = 'd'
    e = """
      f
    """
    g = '''
      h
    '''
    "i".'j'.k = "l"
  `),
	]).toMatchSnapshot();
});

test("should tokenize dotted key with spaces", () => {
	expect([...tokenize(`[[ a . "b" . 'c' ]]`)]).toMatchSnapshot();
});

test("should tokenize complex input", () => {
	expect([...tokenize(example)]).toMatchSnapshot();
});

test("should handle escaped solidus", () => {
	expect([...tokenize(`a = "\\\\"`)]).toMatchSnapshot();
});

test("should reject control characters in unquoted values", () => {
	expect(() => [...tokenize("x = 1.5\u000B")]).toThrow(); // vertical tab
	expect(() => [...tokenize("x = 1.5\u007F")]).toThrow(); // DEL
	expect(() => [...tokenize("x = 1.5\u000C")]).toThrow(); // form feed
});

test("should reject control characters in comments", () => {
	expect(() => [...tokenize("a = 1 # c\u007F")]).toThrow(); // DEL
});

test.each([
	["a = 1\r", /Standalone CR; must be CRLF or LF/],
	['a = """\r"""', /Standalone CR in multiline string/],
	["a = '''\r'''", /Standalone CR in multiline string/],
	['a = """\u0000"""', /Null \(0x00\) not allowed in multiline basic strings/],
	['a = """\u007F"""', /DEL \(0x7F\) not allowed in multiline basic strings/],
	[
		'a = """\u000B"""',
		/Control char 0x0B not allowed in multiline basic strings/,
	],
	[
		"a = '''\u0000'''",
		/Null \(0x00\) not allowed in multiline literal strings/,
	],
	["a = '''\u007F'''", /DEL \(0x7F\) not allowed in multiline literal strings/],
	[
		"a = '''\u000B'''",
		/Control char 0x0B not allowed in multiline literal strings/,
	],
	['a = """x""""""', /Invalid multiline string: 6 consecutive " characters/],
	["a = '''x''''''", /Invalid multiline string: 6 consecutive ' characters/],
	['a = """\\', /Unterminated multiline """ \(possible escape issue\)/],
	['a = "foo', /Expected close of string with "/],
	["a = 'foo", /Expected close of string with '/],
	['a = "\n"', /Newline \(0x0A\) not allowed in basic strings/],
	['a = "\r"', /Carriage return \(0x0D\) not allowed in basic strings/],
	['a = "\u0000"', /Null \(0x00\) not allowed in basic strings/],
	['a = "\u007F"', /DEL \(0x7F\) not allowed in basic strings/],
	['a = "\u000B"', /Control char 0x0B not allowed in basic strings/],
	["a = '\n'", /Newline \(0x0A\) not allowed in literal strings/],
	["a = '\u0000'", /Null \(0x00\) not allowed in literal strings/],
	["a = '\u007F'", /DEL \(0x7F\) not allowed in literal strings/],
	["a = '\u000B'", /Control char 0x0B not allowed in literal strings/],
	["x = 1.5\u0000", /Control char 0x00 not allowed in unquoted value/],
])("rejects %j", (src, re) => {
	expect(() => [...tokenize(src)]).toThrow(re);
});
