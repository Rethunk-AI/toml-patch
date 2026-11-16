import toTOML, { toTOMLCursor } from '../to-toml';
import { NodeType } from '../cst';
import { TomlFormat } from '../toml-format';

/**
 * Emitting a nested value must not add a stack frame beyond the recursion
 * itself: the 1000-deep "scaling-table-inline-nested" fixture only fits in the
 * default stack while that holds. Each emitter is measured by capturing the
 * stack from inside a leaf's `raw` getter, which runs at the deepest point of
 * the walk. One `{key = ...}` level costs two nodes (the inline table and its
 * item). The coordinate emitter recurses once per node (2 frames per level);
 * the cursor emitter also passes through `emitInlineItems` (3). A per-level
 * wrapper function doubles those counts and halves the usable depth.
 */
function emitterFrames(emit: (cst: any) => void, depth: number): number {
  const previousLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = depth * 4 + 50;
  const loc = { start: { line: 1, column: 6 }, end: { line: 1, column: 7 } };
  let stack = '';
  let value: any = {
    type: NodeType.Integer,
    value: 1,
    get raw() {
      stack = new Error().stack ?? '';
      return '1';
    },
    loc,
  };
  for (let i = 0; i < depth; i++) {
    value = {
      type: NodeType.InlineTable,
      items: [{ type: NodeType.InlineItem, item: value, comma: false, loc }],
      loc,
    };
  }
  emit({
    type: NodeType.Document,
    items: [
      {
        type: NodeType.KeyValue,
        key: { type: NodeType.Key, raw: 'key', loc },
        value,
        equals: 4,
        loc,
      },
    ],
    loc,
  });
  Error.stackTraceLimit = previousLimit;
  return stack.split('\n').filter(line => /\bat emit/.test(line)).length;
}

const DEPTH = 50;

test('toTOML emits without an extra stack frame per nesting level', () => {
  expect(emitterFrames(cst => toTOML(cst, TomlFormat.default()), DEPTH)).toBeLessThanOrEqual(DEPTH * 2 + 4);
});

test('toTOMLCursor emits without an extra stack frame per nesting level', () => {
  expect(emitterFrames(cst => toTOMLCursor(cst, TomlFormat.default()), DEPTH)).toBeLessThanOrEqual(DEPTH * 3 + 4);
});
