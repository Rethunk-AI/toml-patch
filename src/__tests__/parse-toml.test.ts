import parseTOML from "../parse-toml";
import {
	type Table,
	type KeyValue,
	type InlineArray,
	type DateTime,
	type TreeNode,
	hasItems,
	isInlineItem,
	isKeyValue,
	isTable,
	isTableArray,
} from "../cst";
import {
	example,
	fruit,
	hard_example,
	hard_example_unicode,
	kitchen_sink,
} from "../__fixtures__";
import dedent from "dedent";
import { createLocate } from "../location";
import { attachSources } from "../cst-source";

test("it should parse inline table", () => {
	expect([...parseTOML(`key = { end = true}`)]).toMatchSnapshot();
});

test("parsed CST ranges agree with node locations", () => {
	const source = `# heading\n[section]\nvalue = [1, { nested = """\ntext""" }, 3]\n`;
	const locate = createLocate(source);
	const blocks = [...parseTOML(source)];
	attachSources(blocks, source);

	function check(node: TreeNode): void {
		expect(node.range).toBeDefined();
		expect(locate(node.range![0], node.range![1])).toEqual(node.loc);

		if (isKeyValue(node)) {
			check(node.key);
			check(node.value);
		} else if (isInlineItem(node)) {
			check(node.item);
		} else if (isTable(node) || isTableArray(node)) {
			check(node.key);
			for (const item of node.items as TreeNode[]) check(item);
		} else if (hasItems(node)) {
			for (const item of node.items as TreeNode[]) check(item);
		}
	}

	for (const block of blocks) check(block);
});

test("it should parse examples", () => {
	expect([...parseTOML(example)]).toMatchSnapshot();
	expect([...parseTOML(fruit)]).toMatchSnapshot();
});

test("it should parse kitchen sink", () => {
	const parsed = [...parseTOML(kitchen_sink)];

	// Normalize local dates and times
	const date_local = (parsed[2] as Table).items[5] as KeyValue;
	const array_items = (date_local.value as InlineArray<DateTime>).items;
	array_items.forEach((array_item) => {
		// @ts-ignore Type 'string' is not assignable to type 'Date'
		array_item.item.value = `${Object.prototype.toString.call(array_item.item.value)}`;
	});

	expect(parsed).toMatchSnapshot();
});

test("it should parse hard examples", () => {
	expect([...parseTOML(hard_example)]).toMatchSnapshot();
	expect([...parseTOML(hard_example_unicode)]).toMatchSnapshot();
});

test("it should parse table key", () => {
	expect([...parseTOML(`[a.b.c]`)]).toMatchSnapshot();
});

test("it should parse table array key", () => {
	expect([...parseTOML(`[[a.b.c]]`)]).toMatchSnapshot();
});

test("it should parse -0", () => {
	expect([...parseTOML(`a = -0`)]).toMatchSnapshot();
});

test("should parse newlines in string", () => {
	expect([
		...parseTOML(`
    a = "val\\nue"
    b = """value\\n"""
  `),
	]).toMatchSnapshot();
});

test("should return correct error for invalid toml", () => {
	const invalid_toml = dedent`
  [package]
  name: Package Name
  `;

	// Expect that calling parseTOML with invalid_toml throws an error
	expect(() => {
		// Convert generator to array to force execution
		Array.from(parseTOML(invalid_toml));
	}).toThrow(
		/Error parsing TOML \(2, 5\):[\s\S]*name: Package Name[\s\S]*\^[\s\S]*Use '=' to separate keys and values, not ':'/,
	);
});

test("should return correct error for invalid escape sequence in string value", () => {
	const invalid_escape = `key = "\\q"`;

	expect(() => {
		Array.from(parseTOML(invalid_escape));
	}).toThrow(/Invalid escape sequence: \\q/);
});

test("should return correct error for invalid escape sequence in key", () => {
	const invalid_escape = `"key\\q" = "value"`;

	expect(() => {
		Array.from(parseTOML(invalid_escape));
	}).toThrow(/Invalid escape sequence: \\q/);
});

test("should return correct error for invalid escape sequence in table key", () => {
	const invalid_escape = `["table\\q"]`;

	expect(() => {
		Array.from(parseTOML(invalid_escape));
	}).toThrow(/Invalid escape sequence: \\q/);
});

test("should return correct error for invalid escape sequence in dotted key", () => {
	const invalid_escape = `a."b\\q".c = 1`;

	expect(() => {
		Array.from(parseTOML(invalid_escape));
	}).toThrow(/Invalid escape sequence: \\q/);
});

test("should return correct ParseError (not TypeError) for incomplete table at EOF", () => {
	const incomplete_table = `[`;

	expect(() => {
		Array.from(parseTOML(incomplete_table));
	}).toThrow(/Expected table key, reached end of file/);
});

test("regression for fuzz seed 40593: date-only value followed by a quoted key", () => {
	const src = dedent`
    a = 2017-04-13
    "Bo5:6" = "x"
  `;

	const result = Array.from(parseTOML(src));
	expect(result).toHaveLength(2);
});

describe("ParseError messages", () => {
	test("should show correct error for leading zeros in integers", () => {
		expect(() => {
			Array.from(parseTOML("a = 01"));
		}).toThrow(/Leading zeros are not allowed in decimal integers/);
	});

	test("should show correct error for consecutive underscores in numbers", () => {
		expect(() => {
			Array.from(parseTOML("a = 1__2"));
		}).toThrow(/Consecutive underscores not allowed/);
	});

	test("should show correct error for trailing underscore in numbers", () => {
		expect(() => {
			Array.from(parseTOML("a = 123_"));
		}).toThrow(/Underscore must be between digits/);
	});

	test.each([
		"a = 1e++2",
		"a = 1e+-2",
		"a = 1.5e++3",
		"a = [1e++2]",
		"a = { y = -1e--5 }",
		"a = 1e--2",
	])("should reject multiple signs in an exponent: %s", (toml) => {
		expect(() => {
			Array.from(parseTOML(toml));
		}).toThrow(/Invalid float/);
	});

	test("should parse a single signed exponent correctly", () => {
		expect(Array.from(parseTOML("a = 1e+2"))[0]).toMatchObject({
			value: expect.objectContaining({ value: 100 }),
		});
		expect(Array.from(parseTOML("a = 1e-2"))[0]).toMatchObject({
			value: expect.objectContaining({ value: 0.01 }),
		});
	});

	test("should show correct error for hexadecimal with sign", () => {
		expect(() => {
			Array.from(parseTOML("a = +0x1A"));
		}).toThrow(/Hexadecimal numbers cannot have a sign prefix/);
	});

	test("should show correct error for octal with sign", () => {
		expect(() => {
			Array.from(parseTOML("a = -0o755"));
		}).toThrow(/Octal numbers cannot have a sign prefix/);
	});

	test("should show correct error for binary with sign", () => {
		expect(() => {
			Array.from(parseTOML("a = +0b1010"));
		}).toThrow(/Binary numbers cannot have a sign prefix/);
	});

	test("should show correct error for uppercase hex prefix", () => {
		expect(() => {
			Array.from(parseTOML("a = 0X1A"));
		}).toThrow(/Hexadecimal prefix must be lowercase "0x"/);
	});

	test("should show correct error for uppercase octal prefix", () => {
		expect(() => {
			Array.from(parseTOML("a = 0O755"));
		}).toThrow(/Octal prefix must be lowercase "0o"/);
	});

	test("should show correct error for uppercase binary prefix", () => {
		expect(() => {
			Array.from(parseTOML("a = 0B1010"));
		}).toThrow(/Binary prefix must be lowercase "0b"/);
	});

	test("should show correct error for invalid hexadecimal digits", () => {
		expect(() => {
			Array.from(parseTOML("a = 0xGHI"));
		}).toThrow(/Invalid hexadecimal digits/);
	});

	test("should show correct error for invalid octal digits", () => {
		expect(() => {
			Array.from(parseTOML("a = 0o789"));
		}).toThrow(/Invalid octal digits \(must be 0-7\)/);
	});

	test("should show correct error for invalid binary digits", () => {
		expect(() => {
			Array.from(parseTOML("a = 0b102"));
		}).toThrow(/Invalid binary digits \(must be 0 or 1\)/);
	});

	test("should show correct error for invalid date with wrong day", () => {
		expect(() => {
			Array.from(parseTOML("a = 2024-02-30"));
		}).toThrow(/day 30 invalid for 2024-02/);
	});

	test("should show correct error for date with trailing T but no time", () => {
		expect(() => {
			Array.from(parseTOML("a = 2065-12-05T"));
		}).toThrow(/'T' requires time component/);
	});

	test("should show correct error for invalid month", () => {
		expect(() => {
			Array.from(parseTOML("a = 2024-13-01"));
		}).toThrow(/month must be 01-12/);
	});

	test("should show correct error for invalid hour (24)", () => {
		expect(() => {
			Array.from(parseTOML("a = 24:15:00"));
		}).toThrow(/hour must be 00-23/);
	});

	test("should show correct error for invalid hour (25)", () => {
		expect(() => {
			Array.from(parseTOML("a = 25:00:00"));
		}).toThrow(/hour must be 00-23/);
	});

	test("should show correct error for invalid minute", () => {
		expect(() => {
			Array.from(parseTOML("a = 12:60:00"));
		}).toThrow(/minute must be 00-59/);
	});

	test("should show correct error for invalid second", () => {
		expect(() => {
			Array.from(parseTOML("a = 12:00:61"));
		}).toThrow(/second must be 00-59/);
	});

	// Neither a JavaScript Date nor Temporal can hold a leap second; accepting one yields an
	// Invalid Date that stringifies as NaN:NaN:NaN.
	test.each([
		"a = 23:59:60",
		"a = 2016-12-31T23:59:60",
		"a = 2016-12-31T23:59:60Z",
	])("rejects a leap second: %s", (src) => {
		expect(() => {
			Array.from(parseTOML(src));
		}).toThrow(/second must be 00-59/);
	});

	test("should show correct error for multiline string as table key", () => {
		expect(() => {
			Array.from(parseTOML('["""key"""]'));
		}).toThrow(/Multiline strings cannot be keys/);
	});

	test("should show correct error for array of tables with whitespace between brackets", () => {
		expect(() => {
			Array.from(parseTOML("[ [table]]"));
		}).toThrow(/"\[\[" brackets must be adjacent/);
	});

	test("should show correct error for leading zeros in float integer part", () => {
		expect(() => {
			Array.from(parseTOML("a = 01.5"));
		}).toThrow(/Leading zeros are not allowed in the integer part of a float/);
	});

	test("should show correct error for incomplete hexadecimal", () => {
		expect(() => {
			Array.from(parseTOML("a = 0x"));
		}).toThrow(/Incomplete hexadecimal number/);
	});

	test("should show correct error for incomplete octal", () => {
		expect(() => {
			Array.from(parseTOML("a = 0o"));
		}).toThrow(/Incomplete octal number/);
	});

	test("should show correct error for incomplete binary", () => {
		expect(() => {
			Array.from(parseTOML("a = 0b"));
		}).toThrow(/Incomplete binary number/);
	});

	test.each([
		["a = 1_e2", /Underscore before exponent is not allowed/],
		["a = 1e_2", /Underscore at start of exponent is not allowed/],
		["a = 1e", /Invalid float "1e": incomplete exponent/],
		["a = 1e+", /Invalid float "1e\+": incomplete exponent/],
		["a = 0x_1", /Underscore must be between digits/],
		["a = 0o_1", /Underscore must be between digits/],
		["a = 0b_1", /Underscore must be between digits/],
		["a = _1", /Underscore must be between digits/],
		["a$ = 1", /Invalid bare key char '\$'/],
		["[[]]", /Array of Tables header \[\[\]\] requires a table name/],
		["[[]", /Array of Tables header \[\[\]\] requires a table name/],
		["[a\nb]", /Table header must be single-line/],
		["[[a\nb]]", /Array of Tables header must be single-line/],
		["[a] extra = 1", /Extra content after table header/],
		["[[a]] extra = 1", /Extra content after Array of Tables header/],
		["[a", /Expected table closing "]", found end of file/],
		["[[a", /Expected "]]" closing, found end of file/],
		["[[a]", /Expected "]]" closing, found end of file/],
		["a = 12:30:01.", /Expected fractional value for DateTime/],
		["a = 1979-05-27T07:32:00.Z", /fractional seconds needs digit after dot/],
		["a = 1979-05-27T07:32:00+", /offset needs HH:MM/],
		[
			"a = 1979-05-27T07:32:00+0700",
			/Offset "\+0700": missing colon separator/,
		],
		["a = 1979-05-27T07:32:00+7:00", /Offset "\+7:00": hour must be 2 digits/],
		["a = 1979-05-27T07:32:00+07:", /Offset "\+07:": minute required/],
		[
			"a = 1979-05-27T07:32:00+07:0",
			/Offset "\+07:0": minute must be 2 digits/,
		],
		["a = 1979-05-27T07:32:00+24:00", /Offset "\+24:00": hour must be 00-23/],
		["a = 1979-05-27T07:32:00-07:60", /Offset "-07:60": minute must be 00-59/],
	])("rejects %j", (src, re) => {
		expect(() => {
			Array.from(parseTOML(src));
		}).toThrow(re);
	});
});
