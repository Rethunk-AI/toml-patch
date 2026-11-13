import { describe, expect, test } from 'vitest';
import { parse, patch } from '../index';

const noop: Record<string, string> = {
  cargo: `# c\n[package]\nname = "x"  # n\nversion = '0.1.0'\n\n[dependencies]\nserde = { version = "1", features = ["derive"] }\ntokio = {version="1"}\n\n[[bin]]\nname = "a"\n\n[[bin]]\nname = "b"\n`,
  crlf: `a = 1\r\n# c\r\n[t]\r\nb = "x"\r\nc = """\r\nline1\r\nline2"""\r\n`,
  unicode: `"ключ" = "значение" # 日本語\n'é' = "\\u00e9\\U0001F600"\nemoji = "😀"\n`,
  bom: `\ufeffa = 1\n`,
  numbers: `d = 1979-05-27T07:32:00Z\nt = 07:32:00\nf = [ 1.0, 2e3, +inf, nan, 0xDEAD_beef, 0o7, 0b1 ]\n`,
  multiline: `s = '''\n  raw \\n\n'''\nl = """\\\n   folded \\\n   text"""\narr = [\n  1, # one\n  2,\n]\n`,
  dotted: `a.b.c = 1\na.b.d = 2\n[x.y]\nz = 1\n[x."q.r"]\nw=2\n`,
  noSpaces: `a=1\nb={c=2,d=[1,2]}\n`,
  noTrailingNewline: `a = 1`,
};

describe('no-op patch reproduces the input byte for byte', () => {
  test.each(Object.entries(noop))('%s', (_name, src) => {
    expect(patch(src, parse(src))).toBe(src);
  });
});

const edits: [string, string, (v: any) => void, string][] = [
  ['delete keeps neighbour comments', `a = 1 # ca\n# about b\nb = 2 # cb\n\n# about c\nc = 3\n`, (v) => { delete v.b; }, `a = 1 # ca\n\n# about c\nc = 3\n`],
  ['edit after a multiline string', `s = """\na\nb"""\nn = 1\nm = 'x'\n`, (v) => { v.n = 2; v.m = 'y'; }, `s = """\na\nb"""\nn = 2\nm = 'y'\n`],
  ['array element removal keeps comments', `a = [\n 1, # one\n 2, # two\n 3,\n]\nb = 1\n`, (v) => { v.a.splice(1, 1); }, `a = [\n 1, # one\n 3,\n]\nb = 1\n`],
  ['array of tables append', `[[b]]\nn=1\n# end\n[[b]]\nn=2\n[c]\nd=1\n`, (v) => { v.b.push({ n: 3 }); }, `[[b]]\nn=1\n# end\n[[b]]\nn=2\n\n[[b]]\nn = 3\n[c]\nd=1\n`],
  ['dotted and quoted keys', `a.b.c = 1\na.b.d = 2\n[x.y]\nz = 1\n[x."q.r"]\nw=2\n`, (v) => { v.a.b.c = 9; v.x['q.r'].w = 3; }, `a.b.c = 9\na.b.d = 2\n[x.y]\nz = 1\n[x."q.r"]\nw=3\n`],
  ['crlf stays crlf', `a = 1\r\n# c\r\n[t]\r\nb = "x"\r\n`, (v) => { v.t.b = 'y'; v.t.n = 5; }, `a = 1\r\n# c\r\n[t]\r\nb = "y"\r\nn = 5\r\n`],
  ['bom survives', `\ufeffa = 1\nb = 2\n`, (v) => { v.b = 3; }, `\ufeffa = 1\nb = 3\n`],
  ['escapes in new value', `a = "x"\n`, (v) => { v.a = 'q"\\\n\t'; }, `a = "q\\"\\\\\\n\\t"\n`],
  ['apostrophe picks a safe literal', `a = 'it'\n`, (v) => { v.a = "it's"; }, `a = '''it's'''\n`],
];

describe('edits touch only the edited key', () => {
  test.each(edits)('%s', (_name, src, edit, want) => {
    const value = parse(src) as any;
    edit(value);
    expect(patch(src, value)).toBe(want);
  });
});

describe('hostile input', () => {
  test('deep nesting throws a catchable error instead of crashing', () => {
    const d = 200000;
    expect(() => parse('a = ' + '['.repeat(d) + ']'.repeat(d) + '\n')).toThrow(RangeError);
  });
  test('a 5 MB string parses and patches', () => {
    const src = `a = "${'x'.repeat(5_000_000)}"\n`;
    expect(patch(src, parse(src))).toBe(src);
  });
});
