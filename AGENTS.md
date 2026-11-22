# AGENTS.md

This is a Hermes delegation backend. When Hermes hands a subtask to a
subagent with its `delegate_task` tool, the plugin picks a Tiiny model for
that subtask based on what kind of work it is. Indexing goes to
`gpt-oss-20b`, coding to `Qwen3.6-35B-A3B`, browser work to `Qwen3.8-27B`,
and so on.

The plugin expects a Hermes provider named `tiiny`.

The install steps are (the user-facing version is `README.md`):

1. Run `npx --package hermes-tiiny-router hermesrouter install`. It copies
   `tiiny-router/` to `$HERMES_HOME/plugins/tiiny-router/` and runs
   `hermes plugins validate`.
2. Add `TIINY_API_KEY` to `~/.hermes/.env` by hand; the installer never
   touches that file.
3. Let the config step add the `tiiny` provider, set
   `delegation.backend: tiiny-router`, and enable the plugin
   (prompted, or `--configure`).
4. Run `npx --package hermes-tiiny-router hermesrouter doctor`, then check
   a goal with
   `npx --package hermes-tiiny-router hermesrouter route-check "..."`, then
   restart the gateway.

Upgrade is `install` again; `uninstall` removes the directory only.

Docs rules for every markdown file and the skill: no em dashes (use
`--`) and no arrow characters (use `->`), except inside a literal that
the code prints, such as the `off→low` route label.


<!-- redeye:start -->
## Agent skills

### Issue tracker

Issues are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. See `docs/agents/domain.md`.
<!-- redeye:end -->


## Layout and smoke check

`tiiny-router/` is laid out exactly as it is installed at
`$HERMES_HOME/plugins/tiiny-router/`, and the installer copies it as one
tree. The routing backend (`__init__.py`, `plugin.yaml`, `tiers.py`,
`thinking.py`) sits at its root, the controller and route checker in
`tiiny-router/scripts/`, and the skill (`SKILL.md`, `references/`,
`templates/`) beside them. Every lookup between these files is relative to
the file doing the lookup (`Path(__file__)`); never add a search list or
a fixed path such as the Hermes source tree. Long-form docs are in `docs/`.

`npm test` copies `tiiny-router/` to a temporary path and runs it there,
so a lookup that depends on the repo layout fails the test. Importing the
backend outside Hermes needs a stub `agent.delegation_provider` module in
`sys.modules`. Run Python with `-B`; otherwise it writes `__pycache__/`
folders, which are not gitignored. Delete any before committing.

## Changing a tier model

`tiiny-router/tiers.py` is the only table the code reads, but the same
model ids, NPU shares and context windows are repeated by hand in
`SKILL.md` (tier table), `references/backend.md` (tier table and the
`tiiny` provider `models:` block), and `docs/README.md`, `docs/PATTERN.md`,
`docs/IMPLEMENTATION.md`, plus the `TIINY_MODELS` map in
`src/config.ts` (what `install --configure` sets). Change them together and grep the repo for the
old id afterwards. `thinking.py` has no per-model table: reasoning
capability is read from the device at runtime.
The backend's `register(ctx)` registers both the delegation provider and
the skill (`ctx.register_skill("tiiny-model-routing", <dir>/SKILL.md)`),
so Hermes serves the skill from the plugin directory. Renaming or moving
`SKILL.md` means changing `SKILL_PATH` in `__init__.py`.
`test/test_register.py` calls `register` with a recording fake `ctx` on a
copied tree; run it with `python3 -B test/test_register.py`.
## The `hermesrouter` command

The command is TypeScript in `src/`, compiled by `tsc` to `dist/`
(gitignored; `prepack` builds it for publishing). It finds the plugin
tree and `package.json` relative to its own file, like the Python side.
There are no runtime dependencies and no install hooks.

`npm test` builds, runs the Node suite (`node --test test/*.test.ts`),
then each Python test file, listed one by one in the `test` script; a
new `test/test_*.py` must be added there or it never runs. The `.ts` tests run through Node's type stripping,
so development needs Node >= 22.18 even though the command targets 20.
The version lives only in `package.json`. Bump it with `npm version`:
its `version` script runs `scripts/stamp-version.ts`, which rewrites the
`version:` line in `tiiny-router/plugin.yaml` and in the `SKILL.md`
front matter and stages both. Never edit those two lines by hand; the
tests fail when they differ from `package.json`.

Tests run the built `dist/cli.js` as a subprocess through
`test/harness.ts`: `makeEnv()` gives a temporary `HOME`/`HERMES_HOME` and
a fake `hermes` first on `PATH` that logs each call's argv
(`hermesCalls()`) and fails when run with `{hermesFails: true}`. Assert
on exit codes, files in the Hermes home and the `hermes` calls, not on
output text.

`ctl` and `route-check` run `scripts/tiiny_ctl.py` and
`scripts/route_check.py` from the installed directory (not the package)
with `python3 -B`. The real scripts need a device, so tests install, then
overwrite the installed script with a Python stand-in that records its
argv and exits with a chosen code (`test/passthrough.test.ts`).
`src/manifest.ts` owns the install manifest
(`.hermes-tiiny-router-manifest.json` in the installed directory).
`readManifest(dir)` returns null for a directory this package did not
install (no manifest, unparseable, or another `package` name); commands
that remove or overwrite the directory must refuse on null. A behavior
that holds "by construction" (such as never calling `hermes config`)
still gets a guard test; check it goes red by briefly breaking the code,
and restore from a copy rather than `git checkout`, which also discards
uncommitted work in that file.
`run(args, {hermesFailsOn: ['config', 'set']})` fails only
the calls starting with those words, so a later step can fail after
`plugins validate` passes. The harness gives the CLI no terminal on
stdin, so a test run is always the non-interactive case.

The config step (`src/config.ts`) changes Hermes config only by running
`hermes config set KEY VALUE`. Model ids contain dots, so the provider's
`models` map is set as one JSON value, not through dotted keys. The
interactive prompt reads stdin with `readSync`; check for a terminal with
`tty.isatty(0)`, never `process.stdin.isTTY`, since touching
`process.stdin` makes fd 0 non-blocking and the read fails with
`EAGAIN`. Check the prompt by hand under a Python `pty.fork()`; macOS
`script` with piped stdin sends a `^D` first and answers empty.

The install manifest (`.hermes-tiiny-router-manifest.json` in the
installed directory) is read and compared by `readManifest` and
`compareManifest` in `src/manifest.ts`. `install` uses them to refuse to
overwrite local edits or a directory without our manifest, unless
`--force` is given. On upgrade, `install` also deletes files
the previous manifest lists but the new tree lacks, only when their hash
still matches (an edited or user-added file is kept). A test can fake an
older version by writing a file and adding its sha256 to the installed
manifest. Reuse them for any other check against the manifest
(e.g. `doctor`) rather than hashing files again. `install` rejects
options it does not know, so a new install flag must be added to
`parseInstallArgs` in `src/cli.ts`.

`doctor` (`src/doctor.ts`) is a list of checks, each giving pass, warn or
fail; only a fail makes the exit non-zero. It reads Hermes config with
`hermes config get KEY` (`hermesOutput` in `src/hermes.ts`), never by
parsing `config.yaml`; in tests, `run(args, {hermesConfig: {KEY: value}})`
sets what the fake answers. The device check imports the installed
`scripts/tiiny_ctl.py` in a `python3 -c` probe. The harness strips every
`TIINY_*` variable and points each run at a fake key and a closed port on
127.0.0.1, because a development machine may have a real key and a
reachable device; keep that so no test reaches real hardware.
