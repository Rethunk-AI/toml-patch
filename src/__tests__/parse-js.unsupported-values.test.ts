import { parse, patch, stringify } from '../';
import parseJS from '../parse-js';

test('a function reports the value and the path instead of recursing', () => {
  expect(() => stringify({ a: () => 1 })).toThrow(TypeError);
  expect(() => stringify({ a: () => 1 })).toThrow('Unsupported value type function at a');
  expect(() => stringify({ a: { b: [1, () => 1] } })).toThrow('Unsupported value type function at a.b[1]');
});

test('a symbol reports the value and the path instead of recursing', () => {
  expect(() => patch('a = 1\n', { a: Symbol('s') })).toThrow('Unsupported value type symbol at a');
  expect(() => parseJS({ a: [{ b: Symbol('s') }] })).toThrow('Unsupported value type symbol at a[0].b');
});

test('a circular object reports the cycle instead of exhausting the stack', () => {
  const root: any = { a: { b: {} } };
  root.a.b.back = root;
  expect(() => stringify(root)).toThrow('Cannot stringify a circular structure at a.b.back');
});

test('the same object may still appear twice when it is not an ancestor', () => {
  const shared = { x: 1 };
  expect(stringify({ a: shared, b: shared })).toBe('[a]\nx = 1\n\n[b]\nx = 1\n');
});
