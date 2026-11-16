# HUMANS

Install, run, and verify this library. Internals live in [AGENTS.md](AGENTS.md).

## Quick start

The published package has no runtime dependencies. Add it with your package manager:

```bash
pnpm add @decimalturn/toml-patch
```

npm works the same way:

```bash
npm install --save @decimalturn/toml-patch
```

Then patch an existing TOML string:

```js
import { patch } from '@decimalturn/toml-patch';

const existing = 'title = "TOML example"\nowner.name = "Bob"\n';
const updated = patch(existing, {
  title: 'TOML example',
  owner: { name: 'Tim' }
});
```

For the standalone lite distribution, install the `lite` npm dist-tag:

```sh
npm install --save @decimalturn/toml-patch@lite
```

For browser usage, you can use unpkg:

```html
<script type="module">
  import * as TOML from 'https://unpkg.com/@decimalturn/toml-patch@v3.3.2/dist/toml-patch.js';
</script>
```

## Install (from a clone)

```bash
git clone --recurse-submodules https://github.com/Rethunk-AI/toml-patch.git
cd toml-patch
pnpm install
```

pnpm is required in this repo; the pinned version is in `package.json`. Spec and cross-parser suites need the git submodules.

## Verify

From a clone:

```bash
pnpm run typecheck && pnpm run lint && pnpm test
```

CI also runs `pnpm run build`, `test:dev`, `test:all`, `fuzz1`, `specs`, and `test:go` (Go plus the pinned `toml-test`).

## Uninstall

From a consuming project:

```bash
pnpm remove @decimalturn/toml-patch
```
