import { vi, test, expect, beforeEach } from 'vitest';
import { parse } from '../';

// Counting wrapper that still runs the real diff: patch() only reaches the
// diff when it did not recognise the document as unchanged.
const diffCalls = vi.hoisted(() => ({ count: 0 }));
vi.mock('../diff', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../diff')>();
  return {
    ...actual,
    default: (...args: Parameters<typeof actual.default>) => {
      diffCalls.count++;
      return actual.default(...args);
    }
  };
});

const { default: patch } = await import('../patch');

beforeEach(() => {
  diffCalls.count = 0;
});

test('a document whose values are non-finite is recognised as unchanged without diffing', () => {
  for (const source of ['a = nan\n', 'a = -nan\n', 'a = inf\n', 'a = -inf\n', 'a = 1e999\n',
    'a = nan\nb = inf\n', 'a = [nan, inf]\n', 'a = { x = -nan }\n']) {
    diffCalls.count = 0;
    expect(patch(source, parse(source))).toBe(source);
    expect({ source, diffed: diffCalls.count > 0 }).toEqual({ source, diffed: false });
  }
});

test('a finite document still takes the fast path', () => {
  expect(patch('a = 1\nb = 2\n', parse('a = 1\nb = 2\n'))).toBe('a = 1\nb = 2\n');
  expect(diffCalls.count).toBe(0);
});

test('flipping the sign of a NaN is still an edit', () => {
  diffCalls.count = 0;
  expect(patch('a = nan\n', { a: -NaN })).toBe('a = -nan\n');
  expect(diffCalls.count).toBeGreaterThan(0);
});
