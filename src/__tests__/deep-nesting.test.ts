import { parse, patch, parseDocument } from '../index';
import ParseError from '../parse-error';

const DEPTH = 20_000;
const docs = {
  array: `a = ${'['.repeat(DEPTH)}${']'.repeat(DEPTH)}`,
  inlineTable: `a = ${'{b='.repeat(DEPTH)}1${'}'.repeat(DEPTH)}`,
};

describe('too-deep nesting', () => {
  for (const [name, toml] of Object.entries(docs)) {
    for (const [fn, call] of Object.entries({
      parse: () => parse(toml),
      parseDocument: () => parseDocument(toml),
      patch: () => patch(toml, {}),
    })) {
      it(`${fn} reports deep ${name} as ParseError`, () => {
        let error: unknown;
        try { call(); } catch (e) { error = e; }
        expect(error).toBeInstanceOf(ParseError);
        expect((error as ParseError).message).toContain('nesting too deep');
        expect((error as ParseError).cause).toBeInstanceOf(RangeError);
      });
    }
  }
});
