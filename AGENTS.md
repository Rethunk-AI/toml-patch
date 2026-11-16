# AGENTS.md

Rethunk-AI's fork of DecimalTurn/toml-patch (published as `@decimalturn/toml-patch`, MIT): parse, patch and stringify TOML 1.1 while keeping comments, whitespace and formatting. The default branch is `latest`; it is a full-history fork, so upstream's branches and release flow are all still here.

## Layout

- `src/`: the library. `parse-toml.ts`, `cst.ts` and `cursor.ts` parse to a concrete syntax tree; `diff.ts` and `patch-lite.ts` compute and apply edits; `formatter.ts`, `generate.ts` and the `*-format.ts` / `*-layout.ts` files write values back. `index.ts` is the entry; `patch-lite-entry.ts` is the standalone lite build.
- `src/__fixtures__`, `src/__invalid__`: test inputs. `browser-tests/` is Playwright; `benchmark/` and `scripts/` hold benchmarks and fuzzers.
- `submodules/`: toml-test, spec-tests, iarna-toml and smol-toml, used by the spec and cross-parser suites. Clone with `--recurse-submodules`.
- `docs/`, `specs/`, `CHANGELOG.md`, `jsr.jsonc` (JSR publish config).

## Gate

CI (`test-and-build.yml`) on Node 22, 24 and 26 runs, in order: `pnpm run typecheck`, `lint` (oxlint), `build`, `test:dev`, `test:all` (vitest, vitest JS config, Playwright), `fuzz1`, `specs`, and `test:go` (needs Go and the pinned `toml-test`). Locally, run at least `pnpm run typecheck && pnpm run lint && pnpm test`. `.gate.toml` adds one gate, a `jsr publish --dry-run`, because `publish.yml` needs registry auth.

## Invariants

- Untouched lines are byte-identical after a patch: comments, tabs, trailing whitespace and line endings. A change that reformats unrelated lines is a bug.
- The package has no runtime dependencies; keep it that way (`sideEffects: false`).
- A user-visible change adds a `CHANGELOG.md` entry; `changelog-check.yml` enforces it.
- Fixes that help every user belong upstream too; keep commits small enough to send as a PR to DecimalTurn/toml-patch.
- pnpm only (the pinned version is in `package.json`); do not add a different lockfile.
