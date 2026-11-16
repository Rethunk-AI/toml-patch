import { parse as smolParse } from 'smol-toml';
import { parse, stringify } from '../';
import patch from '../patch';
import ParseError from '../parse-error';
import { randomToml } from './randomizer';

// Random documents with a few byte-level edits from TOML's significant characters, so most
// inputs sit just off the grammar: unterminated strings, split numbers, stray dots and quotes.
const PIECES = ['"', "'", '\\', '\n', '\r\n', '=', '.', '[', ']', '{', '}', ',', '#', ' ', '\t', 'a', '1', '"""', "'''", 'e', '-', '+', '_', ':', 'T', 'Z', '\u0000', '\u007f', 'é', '0x', 'inf', 'nan'];
const SEEDS = 3000;

function mutate(seed: number): string {
  let state = Math.imul(seed, 2654435761) >>> 0;
  const rand = (n: number) => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state % n;
  };
  let src = randomToml({ seed, maxTables: 4, maxKeyValues: 5 }).toml;
  for (let edits = rand(3); edits > 0; edits--) {
    const at = rand(src.length + 1);
    const piece = PIECES[rand(PIECES.length)];
    const op = rand(3);
    if (op === 0) src = src.slice(0, at) + piece + src.slice(at);
    else if (op === 1) src = src.slice(0, at) + src.slice(at + 1 + rand(4));
    else src = src.slice(0, at) + piece + src.slice(at + piece!.length);
  }
  return src;
}

// Both libraries render a date as text in their own style (separator, case, trailing zeros), and
// smol-toml keeps only milliseconds.
const dateText = (date: Date) => date.toISOString().replace(' ', 'T').toUpperCase()
  .replace(/(\.\d{3})\d+/, '$1').replace(/(\.\d*?)0+(?=$|Z|[+-])/, '$1').replace(/\.(?=$|Z|[+-])/, '');
const comparable = (value: unknown): unknown => JSON.parse(JSON.stringify(value, function (key, v) {
  const raw = (this as any)[key];
  if (raw instanceof Date) return dateText(raw);
  if (typeof v === 'bigint') return `${v}n`;
  return typeof v === 'number' && !Number.isFinite(v) ? String(v) : v;
}));

// The writer places tokens by column and keeps no whitespace characters: a tab between tokens
// comes back as a space, and whitespace at a line end or after the last line is dropped.
const trimLineEnds = (toml: string) =>
  toml.replace(/\t/g, ' ').replace(/ +(?=\r?\n|$)/g, '').replace(/(\r?\n)+$/, '');

test(`${SEEDS} mutated documents parse, re-serialize and patch consistently`, () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  for (let seed = 1; seed <= SEEDS; seed++) {
    const src = mutate(seed);
    let value: any;
    try {
      value = parse(src);
    } catch (err) {
      if (!(err instanceof ParseError)) throw new Error(`seed ${seed}: ${String(err)}\n${JSON.stringify(src)}`);
      continue;
    }

    let smol: unknown;
    try {
      smol = smolParse(src);
    } catch {
      smol = undefined;
    }
    if (smol !== undefined) expect(comparable(value), `seed ${seed}`).toEqual(comparable(smol));

    expect(comparable(parse(stringify(value))), `seed ${seed}`).toEqual(comparable(value));
    const patched = patch(src, value);
    // Mixed line endings are normalized on purpose (with a warning).
    const mixed = src.includes('\r\n') && /(^|[^\r])\n/.test(src);
    const expected = mixed ? src.replace(/\r\n/g, '\n') : src;
    const actual = mixed ? patched.replace(/\r\n/g, '\n') : patched;
    if (trimLineEnds(actual) !== trimLineEnds(expected)) {
      throw new Error(`seed ${seed}: a no-op patch changed the text\n${JSON.stringify(src)}\n${JSON.stringify(patched)}`);
    }
  }
}, 60000);
