<!-- redeye:entry ticket=install-workflow-fixes:5 attempt=1 outcome=done -->
## 2026-11-21 17:19 -- install-workflow-fixes/05 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.56. Checked items: "No user-facing message suggests running `hermes-tiiny-router` as a command (checked by review and a grep of `src/`; no text test is added)", "`npm test` passes".

### Agent notes
# 05: Messages name the real command -- Notes

## What was done

Changed three places in `src/` where user-facing messages said
`hermes-tiiny-router` (the npm package name) instead of `hermesrouter`
(the actual CLI command):

1. `src/cli.ts:8` -- USAGE banner: `Usage: hermesrouter <command>`
2. `src/cli.ts:74` -- top-level error prefix: `hermesrouter: ...`
3. `src/passthrough.ts:19` -- "not installed" error: suggests
   `hermesrouter install`

## What was kept

Three references to `hermes-tiiny-router` remain in `src/` and are
correct -- they name the npm package, not the command:

- `src/uninstall.ts:20` -- "was not installed by hermes-tiiny-router"
- `src/manifest.ts:13` -- manifest filename
- `src/package.ts:10` -- PACKAGE_NAME constant

## Testing

No new tests added per the spec's testing decisions: "no text assertion
is added for the command name, since that would be a text test. The
change is checked by review." All existing tests pass (42 Node, 9 Python).

## TDD skip rationale

Skipped test-first for this item because the spec explicitly says no
text tests are added for the command name change.

---
<!-- redeye:entry ticket=install-workflow-fixes:1 attempt=1 outcome=done -->
## 2026-11-21 17:23 -- install-workflow-fixes/01 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.05. Checked items: "`install --configure` sends `false` for `providers.tiiny.models_discovered` and for `providers.tiiny.extra_body.chat_template_kwargs.enable_thinking`", "`install --configure` sends an integer literal for `providers.tiiny.context_length`", "`install --configure` sends a `providers.tiiny.models` value that parses as a JSON object whose keys are the tier model ids, each with an integer `context_length`", "Each new assertion is checked to go red by briefly breaking the value in `SETTINGS` (restore from a copy, not `git checkout`)".

### Agent notes
# 01: Pin config set values -- Notes

## Implemented

Three guard tests in `test/config.test.ts` that pin the exact value
forms sent to `hermes config set`:

1. Boolean keys (`models_discovered`, `enable_thinking`) must be
   the string `"false"` -- Hermes coerces this to a boolean.
2. `context_length` must be a bare integer literal (`/^\d+$/`).
3. `models` must parse as a JSON object whose keys are the tier
   model ids, each with an integer `context_length`.

Added a comment on `SETTINGS` in `src/config.ts` recording reliance
on Hermes coercion behavior.

## Red verification

Each test was verified to go red by breaking the value in SETTINGS:
- Boolean: changed `'false'` to `'False'` -- failed on strictEqual.
- Integer: changed `'262144'` to `'262144.0'` -- failed on regex match.
- Models JSON: replaced with `"not-json"` -- failed on JSON.parse;
  replaced with `{wrong: ...}` -- failed on deepEqual of sorted keys.

Restored from `.bak` copy each time, not `git checkout`.

## Files changed

- `src/config.ts` -- comment on SETTINGS only
- `test/config.test.ts` -- three new guard tests

---
<!-- redeye:entry ticket=install-workflow-fixes:4 attempt=1 outcome=done -->
## 2026-11-21 17:23 -- install-workflow-fixes/04 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.99. Checked items: "With `TIINY_PLAN_FILE` unset and `HERMES_HOME=<tmp>/home`, the router's plan path is under `<tmp>/home` and equals the controller's default plan path", "With `TIINY_PLAN_FILE` unset and `HERMES_HOME=<tmp>/hermes/profiles/work`, the router's plan path is under `<tmp>/hermes` and equals the controller's", "With `TIINY_PLAN_FILE` set, both sides use that path", "The test imports both from a copied tree (stub `agent.delegation_provider` in `sys.modules`, as in `test/test_register.py`) and runs under `npm test`", "Each new test is checked to go red by briefly breaking the code (restore from a copy, not `git checkout`)".

### Agent notes
# Ticket 04: Router reads the plan from the base Hermes home

## Problem
Router `__init__.py` line 167-169 hardcoded `~/.hermes/tiiny-plan.json`.
Controller `tiiny_ctl.py` uses `_shared_home()` which resolves profile
directories (`.../profiles/<name>` -> parent.parent). With a custom
non-profile HERMES_HOME, the two disagree.

## What was implemented
- Added `_shared_home()` to `__init__.py` duplicating the controller's
  logic for resolving the base Hermes home from HERMES_HOME
- Changed PLAN_FILE to use `_shared_home()` instead of hardcoded
  `~/.hermes` path, with TIINY_PLAN_FILE still as override
- Updated docstrings in `__init__.py` (module docstring and
  `planned_models` docstring)
- Updated `tiiny_ctl.py` docstrings (module docstring and
  `_shared_home` docstring) to reference the router's copy
- Updated `references/backend.md` to say "base Hermes home"
- Created `test/test_plan_path.py` with 3 tests covering all 3
  checklist scenarios
- Added test to `package.json` test script

## Files changed
- `tiiny-router/__init__.py` -- added `_shared_home()`, updated PLAN_FILE
- `tiiny-router/scripts/tiiny_ctl.py` -- updated docstrings only
- `tiiny-router/references/backend.md` -- updated plan path description
- `test/test_plan_path.py` -- new test file
- `package.json` -- added test to test script

## Checklist progress
- [x] HERMES_HOME=<tmp>/home -> plan path under <tmp>/home, equals controller
- [x] HERMES_HOME=<tmp>/hermes/profiles/work -> plan path under <tmp>/hermes, equals controller
- [x] TIINY_PLAN_FILE set -> both sides use that path
- [x] Test imports from copied tree, runs under npm test
- [x] Each test checked to go red (reverted _shared_home, saw 2 failures, restored from /tmp backup)

## Red checks
- Reverted PLAN_FILE to old hardcoded form, confirmed test_plain_hermes_home
  and test_profile_hermes_home both failed. test_tiiny_plan_file_override
  kept passing (as expected -- the override path is unchanged).
- Restored from /tmp/init_backup.py copy (not git checkout).

## Notes for future
- The _shared_home() rule is duplicated between __init__.py and
  tiiny_ctl.py. The spec says a shared module is out of scope for now.
  If this logic ever needs a third copy, extract it.

---
<!-- redeye:entry ticket=install-workflow-fixes:3 attempt=1 outcome=done -->
## 2026-11-21 17:29 -- install-workflow-fixes/03 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.39. Checked items: "`doctor` exits non-zero when `plugins.enabled` does not list `tiiny-router`", "`doctor` exits non-zero when `plugins.enabled` cannot be read", "`doctor` exits non-zero when `plugins.enabled` lists `tiiny-router` and `plugins.disabled` also lists it", "`doctor` exits zero when `tiiny-router` is enabled, not disabled, and the other checks pass", "Each new guard test is checked to go red by briefly breaking the code (restore from a copy, not `git checkout`)".

### Agent notes
# 03: doctor plugin-enabled check

## What was implemented

Added a "plugin enabled" check to `doctor` that reads `plugins.enabled`
and `plugins.disabled` via `hermes config get`. The check fails when
`tiiny-router` is not in `plugins.enabled`, or when it is also in
`plugins.disabled`. A value that cannot be read (empty/missing) counts
as not enabled.

## Files changed

- `src/doctor.ts` -- added the "plugin enabled" check between the
  `delegation.backend` and `python3` checks
- `test/doctor.test.ts` -- added 4 new tests (not-listed, disabled,
  not-set, among-several); updated `SELECTED` config to include
  `plugins.enabled` so existing passing tests still work

## Acceptance criteria interpretation

- "A value that cannot be read" -- treated as: `hermes config get
  plugins.enabled` returns empty stdout (the fake hermes returns nothing
  for keys not in `hermesConfig`). The parsing splits on comma/newline,
  filters empty strings, so an empty response yields an empty list,
  which does not include `tiiny-router` -> fail.

## Guard test verification

All 3 new negative tests (not-listed, disabled, not-set) confirmed to
go red when the check is replaced with `return pass('enabled')`.
Restored from `/tmp/doctor.ts.bak`, not `git checkout`.

## Notes for next attempt

- The list parsing handles JSON arrays (`[a, b]`), comma-separated, and
  newline-separated values. It strips surrounding quotes from each entry.
- `SELECTED` in doctor.test.ts is shared by all tests that expect exit 0.
  Any new config key the doctor checks must be added there.

---
<!-- redeye:entry ticket=install-workflow-fixes:2 attempt=1 outcome=done -->
## 2026-11-21 17:38 -- install-workflow-fixes/02 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $2.74. Checked items: "`install --configure` makes a `plugins enable tiiny-router` call, after every `config set` call", "`install --no-configure` makes no `plugins enable` call", "`install` with no flag in a non-interactive run makes no `plugins enable` call", "With `hermesFailsOn: ['plugins', 'enable']`, `install --configure` exits non-zero", "`uninstall` still makes no `hermes config` or `hermes plugins` calls", "Checked by hand under a Python `pty.fork()` that the enable step does not block an interactive install on a consent prompt", "Each new guard test is checked to go red by briefly breaking the code (restore from a copy, not `git checkout`)".

### Agent notes
# 02: Config step enables the plugin -- Notes

## Implemented

The config step now runs `hermes plugins enable tiiny-router` after all
`hermes config set` calls in `applyConfig`. The enable command also
appears in `configCommands()` so it shows up in the printed fallback
commands when the step is declined or non-interactive.

Uninstall prints `hermes plugins disable tiiny-router` alongside its
existing `hermes config set delegation.backend default` hint.

## Tests added

In `test/config.test.ts`:
- `install --configure enables the plugin after config set` -- asserts
  exactly one `plugins enable tiiny-router` call, after the last
  `config set`.
- `install --configure exits non-zero when plugins enable fails` --
  uses `hermesFailsOn: ['plugins', 'enable']`.
- Extended `--no-configure` and non-interactive tests to also assert
  no `plugins enable` calls.

In `test/uninstall.test.ts`:
- Renamed and extended `uninstall makes no hermes config or plugins call`
  to also check for `plugins` calls.

## Red verification

- Main enable test: broke by commenting out the `runHermes` call and
  hardcoding `enableStatus = 0`. Failed on `0 !== 1` for the enable
  count. Restored from `.bak`.
- Enable-fails test: broke by changing `return enableStatus` to
  `return 0`. Failed on `notStrictEqual`. Restored from `.bak`.

## PTY check

Ran under Python `pty.fork()` with a fake hermes that exits 0:
- `install --configure`: exited code 0, no blocking.
- `install` (interactive): prompted `[y/N]`, answered `y`, exited 0.
The `hermes plugins enable` step does not block on a consent prompt
when our fake hermes is used.

## Files changed

- `src/config.ts` -- `applyConfig` calls `hermes plugins enable`;
  `configCommands` includes the enable command.
- `src/uninstall.ts` -- prints `hermes plugins disable tiiny-router`.
- `test/config.test.ts` -- three new/extended tests for plugin enabling.
- `test/uninstall.test.ts` -- extended guard to check plugins calls.
- `README.md` -- config step, doctor, and uninstall sections updated.
- `AGENTS.md` -- install step 3 mentions plugin enabling.

## Doctor check

The `plugin enabled` doctor check already existed before this ticket
(lines 136-166 in `doctor.ts`), along with its tests in
`test/doctor.test.ts`. No changes were needed there.

---
