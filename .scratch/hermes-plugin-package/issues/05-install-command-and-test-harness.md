# 05: `hermesrouter install`, first version

**What to build:** A user runs `npx --package hermes-tiiny-router hermesrouter
install` and gets the plugin directory at
`$HERMES_HOME/plugins/tiiny-router/`
(`HERMES_HOME` defaults to `~/.hermes`). The command is TypeScript,
compiled for Node >= 20, no runtime dependencies, delivered through
`bin` only (no `postinstall`). `package.json` declares
`"os": ["darwin", "linux"]` and `"engines": {"node": ">=20"}`. `install`
copies the tree, writes a manifest of file hashes (marking the directory
as installed by this package), then runs `hermes plugins validate` on
the directory. Re-installing over an unchanged install succeeds.

Sets up the seam 1 harness with `node:test` in TypeScript: each test
gets a temporary `HERMES_HOME` and a fake `hermes` executable first on
`PATH` that records its arguments and can be told to fail. `npm test`
runs the Node suite and the seam 2 Python test from 04 (when present).

**Blocked by:** 02

**Touches:** `package.json` (`bin`, `os`, `engines`, `scripts`,
`files`), `tsconfig.json`, `src/` (CLI entry, install, manifest),
`test/` (harness, fake `hermes`)

**Status:** done

- [x] `install` into an empty temporary `HERMES_HOME` creates
      `plugins/tiiny-router/` containing every file of the source tree
- [x] `install` respects a non-default `HERMES_HOME`
- [x] `install` invokes `hermes plugins validate` on the installed
      directory, and exits non-zero when the fake `hermes` fails it
- [x] Running `install` twice with no edits in between succeeds and
      leaves a complete directory
- [x] `install` never modifies `config.yaml` or the secrets file in the
      `HERMES_HOME`
