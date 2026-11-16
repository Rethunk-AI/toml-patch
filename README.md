<h1 align="center">toml-patch</h1>

<div align="center">

<img src="assets/toml-patch-logo.png" alt="toml-patch logo" width="120"/>

[![NPM Version](https://img.shields.io/npm/v/%40decimalturn%2Ftoml-patch?logo=npm&logoColor=white&labelColor=red&color=blue)](https://www.npmjs.com/package/@decimalturn/toml-patch)
[![JSR Version](https://img.shields.io/jsr/v/%40decimalturn/toml-patch?logo=jsr&color=blue)](https://jsr.io/@decimalturn/toml-patch)
[![GitHub branch status](https://img.shields.io/github/check-runs/DecimalTurn/toml-patch/latest)](https://github.com/DecimalTurn/toml-patch/actions/workflows/test-and-build.yml)

</div>

---

toml-patch edits [TOML](https://toml.io/en/) 1.1 documents without rewriting lines you did not change. Comments, tabs, trailing whitespace, and line endings on those lines stay as they were.

The published package is `@decimalturn/toml-patch`. It exports `patch`, `parse`, and `stringify`, plus `TomlDocument` for repeated work on one file and `TomlFormat` for stringify and patch options. There are no runtime dependencies. This tree is Rethunk-AI's fork of DecimalTurn/toml-patch, which started as a fork of [timhall/toml-patch](https://github.com/timhall/toml-patch).

## Quick start

```bash
pnpm add @decimalturn/toml-patch
```

Install options, the lite dist-tag, browser usage, and how to verify a clone are in [HUMANS.md](HUMANS.md).

## Highlights

- Parse, patch, and stringify TOML 1.1
- Untouched lines stay byte-identical after a patch
- `TomlDocument` for multi-step edits and `TomlFormat` for output options
- `patch-lite` dist-tag for edit-only installs
- Optional Temporal date/time values
- Comments travel with the entry they describe when `patch()` removes or reorders it

## Documentation

| Document | Contents |
| --- | --- |
| [HUMANS.md](HUMANS.md) | Install, verify, uninstall |
| [AGENTS.md](AGENTS.md) | Layout, gate, invariants |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow |
| [API](docs/API.md) | `patch`, `parse`, `stringify`, `TomlDocument` |
| [Comment ownership](docs/Comment-Ownership.md) | Which comments move with an entry |
| [Date/time](docs/Dates.md) | `Date` subclasses and Temporal |
| [Formatting](docs/Formatting.md) | `TomlFormat` options |
| [Patch-lite](docs/Patch-Lite.md) | Edit-only distribution |
| [Changelog](CHANGELOG.md) | Release notes |
| [License](LICENSE) | MIT |

## API

`toml-patch` provides a functional API for one-time operations and a document-oriented API for workflows that need multiple operations on the same TOML document.

See the [API reference](docs/API.md) for `patch`, `parse`, `stringify` and the `TomlDocument` class.

For a quick start, patch an existing TOML string like this:

```js
import { patch } from '@decimalturn/toml-patch';

const existing = 'title = "TOML example"\nowner.name = "Bob"\n';
const updated = patch(existing, {
  title: 'TOML example',
  owner: { name: 'Tim' }
});
```

## Comment Ownership

When `patch()` removes or reorders an entry, any comment describing it (a same-line trailing
comment, or a line-comment directly above with no blank line in between) travels along with
it, instead of being left behind to describe whatever ends up in that spot. This applies to root
keys, `[table]`/`[[array-of-tables]]` blocks, and elements inside multi-line arrays and inline
tables.

```js
import * as TOML from '@decimalturn/toml-patch';
import { strict as assert } from 'assert';

const existing = `
x = 1 # a note about x
y = 2
`;

const patched = TOML.patch(existing, { y: 2 });

assert.strictEqual(patched, `
y = 2
`);
```

See the [comment ownership guide](docs/Comment-Ownership.md) for the full behavior, including how a blank line opts a comment out of ownership and current scope limitations.

Note that `patch()` does not reorder entries by default.
To have it match the key order of the object you pass in, enable `updateOrder` in the [formatting options](docs/Formatting.md#updateorder).

## Date/Time Handling & Temporal

TOML date/time values are parsed into custom `Date` subclasses (`LocalDate`, `LocalTime`, `LocalDateTime`, `OffsetDateTime`) by default. Set `temporal: true` to receive [Temporal](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Temporal) objects instead. `stringify()` and `patch()` auto-detect Temporal objects and serialize them correctly. Fractional seconds keep the source precision, sub-millisecond digits included.

### Enabling Temporal

The `temporal: true` option requires `Temporal` to be available in the runtime:

| Runtime | How to enable |
| --- | --- |
| **Node.js 26+** | Built-in (no config needed) |
| **Node.js 20–24** | `node --harmony-temporal` flag |
| **Node.js 14–26** | [@js-temporal/polyfill](https://www.npmjs.com/package/@js-temporal/polyfill) |

```js
import * as TOML from '@decimalturn/toml-patch';

// Node 26+ (native) or Node 20–24 with --harmony-temporal:
const obj = TOML.parse('d = 2024-01-15\n', { temporal: true });
// obj.d → Temporal.PlainDate

// All Node versions with the polyfill:
import { Temporal } from '@js-temporal/polyfill';
globalThis.Temporal = Temporal;
const obj2 = TOML.parse('d = 2024-01-15\n', { temporal: true });
// obj2.d → PlainDate (polyfill)
```

> **Note:** Only offset-based timezones (`+05:30`, `Z`) are supported in TOML. IANA timezone annotations (e.g., `[Asia/Kolkata]`) will throw an error.

See the [date/time guide](docs/Dates.md) for details and examples.

## Patch-lite

`patch-lite` is a smaller, edit-only distribution for applications that only need to update existing TOML values, such as bumping a package version. It exposes the same `patch` name with a two-argument `(existing, updated)` signature.

It is not part of the main package: the main package ships the full API only. Install the lite build from the `lite` npm dist-tag, then import it with the same specifier:

```sh
npm install --save @decimalturn/toml-patch@lite
```

```js
import { patch } from '@decimalturn/toml-patch';

const existing = 'version = "1.0.0"\n';
const updated = patch(existing, { version: '1.0.1' });
// updated === 'version = "1.0.1"\n'
```

For more info, check out the [Patch-lite guide](docs/Patch-Lite.md)

## Formatting

The `TomlFormat` class controls how TOML documents are formatted during stringification and patching operations.

The recommended approach is to start with `TomlFormat.default()` and override the options you need. e.g.:

```js
import { stringify, TomlFormat } from '@decimalturn/toml-patch';

const format = TomlFormat.default();
format.newLine = '\r\n';
format.trailingNewline = 0;
format.trailingComma = true;
format.bracketSpacing = false;
format.indentWidth = 4;
format.multilineTable = 'parent';

const toml = stringify({
  title: 'My App',
  tags: ['dev', 'config'],
  database: { host: 'localhost', port: 5432 }
}, format);

```

See the [formatting reference](docs/Formatting.md) for the complete list of options, auto-detection behavior, `updateOrder` and more examples.

## License

MIT. See [LICENSE](LICENSE).

Copyright (c) 2019–2025 Tim Hall
Copyright (c) 2025 Martin Leduc
