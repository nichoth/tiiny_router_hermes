<!-- redeye:entry ticket=hermes-plugin-package:1 attempt=1 outcome=done -->
## 2026-11-20 21:41 -- hermes-plugin-package/01 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.52. Checked items: "Only the survivor paths and the moved package contents remain in the tree", "There is exactly one copy of the backend modules (`__init__.py`, `plugin.yaml`, `tiers.py`, `thinking.py`) and of each controller script", "`python3 skill/scripts/route_check.py` still runs from the moved tree as it did before the move".

### Agent notes
# Ticket 01 notes: prune repo and move package to root

## Done
- Deleted (git rm, ordinary commit): agent-memory-commons/, bot-identity/,
  muse-patterns/, OpenHuman/, private-agent-network/, remote-agent-access/,
  Tiiny/, tiiny-image-agency/, tiiny-mesh/, tiiny-model-catalogue/,
  tiiny-two-boxes/, top-level README.md.
- Duplicates removed: tiiny-model-routing/examples/tiiny-router/ (diff -r
  identical to skill/plugin/) and tiiny-model-routing/scripts/ (each file
  identical to skill/scripts/). Kept the skill/ copies.
- tiiny-model-routing/skill/ -> skill/ at the repo root.
- tiiny-model-routing/{README,PATTERN,IMPLEMENTATION}.md -> docs/.
- Kept package-lock.json alongside package.json (lockfile for the redeye
  devDependency).
- AGENTS.md: added layout + smoke check note.

## Interpretation
- "contents of tiiny-model-routing/ move to the repo root": after removing
  duplicates and moving the three docs to docs/, the only remaining content
  was skill/, so the root now has skill/. Did not flatten skill/ further;
  the installed-tree layout is decided in later tickets.
- Links inside the moved docs and SKILL.md were not edited (ticket says
  mechanical move; doc rewrites belong to later tickets).

## TDD decision
- All three checklist items are a mechanical file move (scaffolding). The
  spec's test seams (CLI subprocess, register(ctx)) do not exist yet, so no
  test was written first. Verification instead: captured
  `route_check.py --all` and a goal-based run before the move, re-ran after,
  outputs byte-identical, both exit 0.
- No npm test or lint script exists yet.
- All three items landed in one commit because they are the same move.

---
<!-- redeye:entry ticket=hermes-plugin-package:2 attempt=1 outcome=done -->
## 2026-11-20 21:43 -- hermes-plugin-package/02 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.95. Checked items: "A copy of the directory placed at an arbitrary path runs `route_check.py` successfully", "A copy of the directory placed at an arbitrary path runs a read-only `tiiny_ctl.py` command that loads the tier table (e.g. `--help` or a plan dry run) without "could not find the tier table"", "Importing the backend module from a copy at an arbitrary path loads the controller module (`ctl` is not `None`)", "No lookup references `examples/`, `skill/plugin`, or `hermes-agent/plugins/delegation`".

### Agent notes
# Ticket 02 notes: source tree mirrors installed directory

## Layout decision
- `skill/` renamed to `tiiny-router/`; backend modules lifted from
  `skill/plugin/` to the tree root, so `tiiny-router/` is exactly
  `$HERMES_HOME/plugins/tiiny-router/` (Hermes needs `__init__.py` and
  `plugin.yaml` at the plugin dir root). Controller stays in `scripts/`;
  skill (`SKILL.md`, `references/`, `templates/`) at the root.

## Tests
- `test/test_installed_tree.py` (Python unittest, `npm test`). Copies
  `tiiny-router/` to a temp path, temp HOME/HERMES_HOME, runs scripts
  with `-B`. Spec allows a standalone Python script for the Python seam;
  no TS/node:test infra exists yet (later ticket builds the CLI).

## Item 1 (route_check from a copy) -- done
- route_check.py: `_PLUGIN_DIRS` search list replaced with one
  `_PLUGIN_DIR = Path(__file__).parent.parent`.
- Also: package.json `test` script, AGENTS.md layout section rewritten.

## Item 2 (tiiny_ctl from a copy) -- done
- tiiny_ctl.py `_load_tiers`: candidates list (skill/plugin, examples,
  Hermes source tree, ...) replaced by `SKILL_ROOT / "tiers.py"`.
  `SKILL_ROOT` = `HERE.parent` = plugin dir; name kept (still the skill
  root) to keep the diff small.
- Test uses `--help`: tiers load at import before argparse, so a missing
  table exits 1. A plan dry run would write a plan file, so not used.
- Left alone (not tier-table lookups, out of scope): `devices.py`
  lookup under `$HERMES_HOME/mesh`, `_find_vault` walk.

## Item 3 (backend import loads ctl) -- done
- `__init__.py` `_CTL_SPEC`: `parent.parent / scripts` -> `parent /
  scripts`. Note the old failure was silent: spec_from_file_location
  returns a spec for a missing file and the exec error is swallowed, so
  `ctl` just became None.
- Test imports the copy as a package via spec_from_file_location with
  submodule_search_locations, stubbing `agent.delegation_provider`.

## Item 4 (no lookup references old paths) -- done
- No separate code change: items 1-3 removed every such entry. Verified
  by grep over tiiny-router/ (*.py, *.sh, *.yaml): no `examples`,
  `skill/plugin`, `hermes-agent`. No string-grep test added (brittle);
  the copy tests run with a temp HOME, so any fallback to
  ~/.hermes/hermes-agent/... or a repo-layout path would fail them.
- Docs (SKILL.md, references, docs/) still mention old paths; rewriting
  them is a later ticket per the spec.

---
<!-- redeye:entry ticket=hermes-plugin-package:4 attempt=1 outcome=done -->
## 2026-11-20 21:44 -- hermes-plugin-package/04 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.65. Checked items: "`register(ctx)` registers exactly one delegation provider", "`register(ctx)` registers a skill named `tiiny-model-routing`", "The registered skill path resolves to a `SKILL.md` inside the plugin directory, including when the directory is copied to an arbitrary path".

### Agent notes
# Ticket 04 notes: backend registers the skill

## Implemented
- `tiiny-router/__init__.py`: `SKILL_NAME`/`SKILL_PATH`
  (`Path(__file__).resolve().parent / "SKILL.md"`); `register(ctx)` now
  also calls `ctx.register_skill(SKILL_NAME, SKILL_PATH)` (positional,
  since the spec gives only the method name; no external API research).
- `test/test_register.py` (seam 2, unittest, standalone): copies the tree
  to a temp path, runs a probe subprocess that stubs
  `agent.delegation_provider`, calls `register` with a recording fake
  ctx, prints calls as JSON. Fake `register_skill` accepts name/path
  positionally or by keyword.
- `SKILL.md`: requirements bullet now says the skill ships in the plugin
  and resolves as `tiiny-router:tiiny-model-routing`. Broader rewrite of
  vault/symlink text is left to the docs ticket.
- AGENTS.md: note on register() and the test.
- Not wired into `npm test` (ticket says 05 does that).

## Items
1. Exactly one delegation provider: already true before this ticket; the
   test passed on first run (documents existing behaviour, not red-first).
2. Skill named tiiny-model-routing: red then green.
3. Skill path inside copied plugin dir: red then green; asserts the path
   is a file named SKILL.md under the copy's resolved root.
- Committed as one commit: items 2 and 3 share the same one-line change,
  and the test file could not be committed red.

## For next attempt / later tickets
- If real Hermes `register_skill` uses a different signature (e.g. keyword
  names or a description arg), adjust the call and the fake ctx together.

---
<!-- redeye:entry ticket=hermes-plugin-package:3 attempt=1 outcome=done -->
## 2026-11-20 21:44 -- hermes-plugin-package/03 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.72. Checked items: "No file in the package mentions `Ornith-1.0-35B`".

### Agent notes
# Ticket 03 notes: Ornith-1.0 -> Ornith-1.5-35B-A3B-Turbo

## Items 1-3 (route_check reports 1.5, never 1.0, code default unchanged)
- One-line change in `tiiny-router/tiers.py` `TIER_CHOICES["code"]`,
  second position: `("ornith-ai/Ornith-1.5-35B-A3B-Turbo", 54, 262144)`.
- Tests in `test/test_installed_tree.py` (copied-tree seam, subprocess):
  parse the `code` rows of `route_check.py --all` (tier, model, NPU,
  context as structured columns, not prose) and assert default is
  Qwen3.6-35B-A3B, first fallback is the 1.5 tuple; plus a
  `--tier code --alternatives` run must not report Ornith-1.0-35B.
  Red confirmed before the change.
- thinking.py verified: no per-model table, reasoning capability is
  read from the device catalogue at runtime, so no change needed.
- All three items satisfied by one change, committed together.

## Item 4 (no file mentions Ornith-1.0-35B) -- docs only, no test
- Docs/config text; a string-grep test would be brittle (per AGENTS.md
  and global rules), so verified by grep instead. Only remaining hits are
  the test asserting absence (test/ is not the package).
- Replaced in SKILL.md, references/backend.md (tier table + models:
  block, context_length 262144), docs/PATTERN.md, docs/README.md (row
  description rewritten for 1.5 MoE, ~3B active of 35B, repo-scale
  coding and agentic work; TIER_CHOICES snippet), docs/IMPLEMENTATION.md
  (snippet + models: block). two-box matrix: dropped the 1.0 entry.
- Judgment calls: kept the "Reasoning" column as `switch` and SKILL.md's
  "downloaded" column as it was for 1.0, since the ticket says reasoning
  behaviour is the same and gave no residency data. Note the ticket's
  "always on, not toggleable" wording conflicts with the docs' `switch`
  for 1.0; not resolved here. docs/ tier tables list the code tier in a
  stale order (Coder-30B first); left alone, out of scope.
- AGENTS.md: added "Changing a tier model" section.

---
<!-- redeye:entry ticket=hermes-plugin-package:5 attempt=1 outcome=done -->
## 2026-11-20 21:46 -- hermes-plugin-package/05 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.03. Checked items: "`install` into an empty temporary `HERMES_HOME` creates `plugins/tiiny-router/` containing every file of the source tree", "`install` respects a non-default `HERMES_HOME`", "`install` invokes `hermes plugins validate` on the installed directory, and exits non-zero when the fake `hermes` fails it", "Running `install` twice with no edits in between succeeds and leaves a complete directory", "`install` never modifies `config.yaml` or the secrets file in the `HERMES_HOME`".

### Agent notes
# Ticket 05 notes: install command and test harness

## Setup
- Added devDeps `typescript` (7.x) and `@types/node` via
  `npm install -D --prefer-offline`. `dist/` gitignored; built by
  `npm run build` (tsc) and `prepack` (so a published tarball has it).
  Used `prepack`, not `prepare`/`postinstall`: spec says no install hooks.
- package.json: name `hermes-tiiny-router`, version `0.0.0` (no version
  existed; later ticket stamps it into plugin.yaml), `type: module`,
  `bin`, `files`, `os`, `engines`, license MIT (from LICENSE).
- Tests are `.ts` run directly by `node --test` (native type stripping;
  needs Node >= 22.18 for dev, the shipped CLI is compiled for >= 20).
  tsconfig only covers `src/`.

## Harness (test/harness.ts)
- `makeEnv({hermesHome?})`: temp root, temp HOME, fake `hermes` shell
  script first on PATH. It appends its argv as a JSON line to a log;
  exits with `FAKE_HERMES_EXIT` (`run(args, {hermesFails:true})`).
  HERMES_HOME is unset unless `hermesHome` given (then default is
  `$HOME/.hermes` in the temp HOME).

## Item 1 -- done
- src/cli.ts, src/install.ts, src/manifest.ts, src/package.ts.
- Manifest: `.hermes-tiiny-router-manifest.json` in the installed dir,
  `{package, version, files: {relpath: sha256}}`. `__pycache__` skipped.

## Item 2 -- done
- Test only; behavior already came from `hermesHome()` in src/package.ts.
  Verified the test goes red when HERMES_HOME is ignored.

## Item 3 -- done
- src/hermes.ts `runHermes(args)`: spawnSync `hermes` from PATH, stdio
  inherited; ENOENT -> clear error (exit 1). install runs
  `hermes plugins validate <installed dir>` after writing the manifest
  and returns hermes's exit code on failure. The directory is left in
  place when validation fails (no rollback in this first version).
- Test compares the validate path via realpath (macOS /var -> /private).

## Item 4 -- done
- Test only; passed on first run because install overwrites files in
  place (copyFileSync) and rewrites the manifest. No local-edit check
  or foreign-dir check yet (later ticket: manifest hash comparison,
  `--force`). Stale files from an older version are not removed yet.

## Item 5 -- done
- Guard test: seeds `config.yaml` and `.env` in HERMES_HOME, installs
  twice, asserts content and mtime unchanged. Passes by construction
  (install never touches them); it exists to catch a regression when
  the config step lands. Secrets file assumed to be `$HERMES_HOME/.env`
  (per AGENTS.md install steps).

---
<!-- redeye:entry ticket=hermes-plugin-package:11 attempt=1 outcome=done -->
## 2026-11-20 21:48 -- hermes-plugin-package/11 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.67. Checked items: "Arguments given after `ctl` reach the installed controller unchanged", "Arguments given after `route-check` reach the installed route checker unchanged", "The command's exit code equals the script's exit code, for both zero and non-zero", "Without an install, both subcommands exit non-zero".

### Agent notes
# Ticket 11 notes: route-check and ctl passthrough

## Approach
- src/passthrough.ts `runInstalledScript(script, args)`: resolves
  `$HERMES_HOME/plugins/tiiny-router/scripts/<script>` via `pluginDir()`,
  runs `python3 -B <file> ...args` with stdio inherited, returns its exit
  status (1 if killed by a signal). Missing script -> message, exit 1.
- src/cli.ts dispatches `ctl` -> tiiny_ctl.py, `route-check` ->
  route_check.py with everything after the subcommand.
- Tests (test/passthrough.test.ts): install, then overwrite the installed
  script with a Python stand-in that dumps sys.argv[1:] to a JSON file and
  exits with a chosen code. The real scripts talk to a device, so a stub is
  the only way to observe argv/exit code at Seam 1.

## Item 1 -- done
- ctl args (incl. '--help', '', spaces, '$HOME', '*') reach the script.

## Item 2 -- done
- The route-check dispatch landed with item 1 (same table), so this test
  passed on first run. Verified it goes red when `route-check` is mapped
  to the wrong script.

## Item 3 -- done
- Test covers exit codes 0, 3, 42 for both subcommands. Passed on first
  run (status passthrough was in item 1); verified red when the code is
  collapsed to 0/1.

## Item 4 -- done
- Without an install both subcommands print a hint and exit 1. Test
  passed on first run (check was in item 1); verified red when the
  missing-install branch returns 0.
- Full `npm test`: 12/12 Node tests pass, Python suite OK.
- AGENTS.md: added how ctl/route-check resolve scripts and how to test
  them with a stand-in script.

---
<!-- redeye:entry ticket=hermes-plugin-package:6 attempt=1 outcome=done -->
## 2026-11-20 21:48 -- hermes-plugin-package/06 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.80. Checked items: "After `install`, the installed `plugin.yaml` version and the manifest version equal the `package.json` version", "Running the stamp script after changing the `package.json` version updates both `plugin.yaml` and `SKILL.md`".

### Agent notes
# Ticket 06 notes: version stamping

## Item 1 -- done
- Test: test/version.test.ts installs, then compares manifest `version`
  and installed `plugin.yaml` `version:` with package.json. Red at first
  (package.json 0.0.0 from ticket 05, plugin.yaml 2.1.0).
- Green: package.json version set to 2.1.0 (the plugin's existing
  version, so stamping does not regress plugin.yaml/SKILL.md to 0.0.0).
  Manifest already recorded packageVersion() since ticket 05.
- Added `contributors` as objects `{name}` so npm does not parse
  "(garciacionet-alt)" as a URL.
- package-lock.json was stale (old worktree name, no version); refreshed
  with `npm i --package-lock-only --prefer-offline`. Only root metadata
  changed.

## Item 2 -- done
- Test only: installed SKILL.md front matter `version:` equals
  package.json. Passed on first run (both 2.1.0 after item 1); verified
  it fails when SKILL.md's version is changed to 9.9.9.

## Item 3 -- done
- scripts/stamp-version.ts (plain erasable TS, run by `node` directly,
  so it needs Node >= 22.18 like the tests; not shipped, not in tsc
  config). Finds package.json and tiiny-router/ relative to its own
  file. Replaces the first unindented `version:` line in plugin.yaml
  and in SKILL.md's front matter only; throws if either is missing.
- package.json `scripts.version`: run the stamp, then `git add` both
  files, so `npm version <x>` commits them with package.json.
- Test copies package.json, the script and the two files into a temp
  root, sets version 7.3.1-rc.2, runs the script (cwd elsewhere), and
  checks both versions and that nothing else in SKILL.md changed.
- AGENTS.md: added how versioning works.
- docs/IMPLEMENTATION.md:55 still shows `version: 2.1.0` in an example
  plugin.yaml; left alone (docs, not stamped).

---
<!-- redeye:entry ticket=hermes-plugin-package:9 attempt=1 outcome=done -->
## 2026-11-20 21:49 -- hermes-plugin-package/09 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.90. Checked items: "After `install`, `uninstall` removes `plugins/tiiny-router/` and exits zero", "`uninstall` leaves every other file in the `HERMES_HOME` unchanged, including `config.yaml`, the secrets file, and other plugins", "`uninstall` makes no `hermes config set` call".

### Agent notes
# Ticket 09 notes: uninstall

Seam: CLI as subprocess (spec Seam 1), tests in test/uninstall.test.ts.

## Item 1 -- done
- src/uninstall.ts, wired in src/cli.ts. Red (exit 1: unknown command)
  then green.

## Item 2 -- done
- Guard test only: seeds config.yaml, .env, another plugin; asserts
  content+mtime unchanged. Passed by construction; verified it goes red
  when uninstall removes the parent `plugins/` dir.

## Item 3 -- done
- src/manifest.ts `readManifest(dir)`: null when missing, unparseable,
  or `package` is not ours. uninstall refuses (exit 1) when null.
- Extra decisions (tested): a manifest from another package is refused;
  no directory at all -> exit 0 ("nothing to remove"), since the end
  state is already reached. Ticket did not specify the latter.
- Mutation check: dropping the package-name check turns the
  foreign-package test red.

## Item 4 -- done
- Guard test: no `hermes config ...` call during uninstall. Passed by
  construction; verified red when uninstall calls `hermes config set`.
- uninstall prints `hermes config set delegation.backend default` as the
  unselect command (not asserted: output text). "default" as the
  unselected value is an assumption taken from the value seeded in
  test/install.test.ts; nothing in the repo names Hermes's default
  backend. Adjust if Hermes uses another name.
- AGENTS.md: added readManifest convention and guard-test/mutation tip.

---
<!-- redeye:entry ticket=hermes-plugin-package:7 attempt=1 outcome=done -->
## 2026-11-20 21:49 -- hermes-plugin-package/07 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $0.71. Checked items: "With an installed file edited, `install --force` exits zero and the file matches the package again", "With a pre-existing target directory that has no manifest, `install` exits non-zero and leaves it untouched", "With that foreign directory, `install --force` installs".

### Agent notes
# Ticket 07 notes: re-install protection

## Item 1 -- done (edited file blocks install)
- src/manifest.ts: `readManifest(dir)` (null if absent, unparsable, or
  `package` is not ours -> foreign) and `compareManifest(dir, manifest)`
  -> `{edited, missing}`. Doctor (10) should reuse both: `edited` for "no
  file differs", `missing` for "directory is complete".
- src/install.ts: `overwriteProblem(target)` runs before any copy. Absent
  or empty target is fine; a non-empty dir without our manifest is
  foreign; any `edited` file blocks. Exit 1, nothing written.
  Missing files do not block (nothing to lose).
- src/cli.ts: `install [--force]`; unknown install options are rejected
  (ticket for --configure/--no-configure must extend the allowed list).
- test/install.test.ts: edits tiers.py, re-installs, asserts non-zero
  and file content unchanged.

## Item 2 -- done (--force replaces edit)
- Test only; `--force` was wired in item 1. Verified the test fails when
  cli.ts ignores `--force`. Test also checks a plain re-install works
  after a forced one (manifest rewritten).

## Item 3 -- done (foreign dir untouched)
- The foreign-dir check was written together with item 1 (same guard),
  so this test passed at once; verified it fails when the check is
  removed. Asserts non-zero exit, same file list and content, and that
  `hermes` was never called.

## Item 4 -- done (--force over foreign dir)
- Test only; verified red when `--force` is ignored. Note: `--force`
  copies over the foreign dir but does not delete files that are not in
  the package (e.g. a stray `extra.txt` survives). Stale-file removal is
  not in this ticket.

---
<!-- redeye:entry ticket=hermes-plugin-package:8 attempt=1 outcome=done -->
## 2026-11-20 21:51 -- hermes-plugin-package/08 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.45. Checked items: "A non-interactive `install` with neither flag makes no `hermes config set` call".

### Agent notes
# Ticket 08 notes: config step

## Implemented
- `src/config.ts`: `SETTINGS` (ordered `[key, value]` list), `configStep`
  (`configure` applies, `skip` does nothing, `ask` prompts on a TTY and
  otherwise prints the commands), `configCommands()` (shell-quoted).
- `src/install.ts`: `install(configMode)` runs the config step after
  `plugins validate` passes; returns the config step's exit code.
- `src/cli.ts`: `install [--configure | --no-configure]`; both together
  or an unknown option is an error. No `--force` parsing here (that is
  the local-edit ticket); merge with it.
- `test/config.test.ts` (seam 1), `test/harness.ts` gains
  `hermesFailsOn` (prefix-matched failure).
- `references/backend.md`: provider block gained `models_discovered:
  false` (the prose already said it matters), plus a sentence that
  `install --configure` applies steps 2 and 3 except
  `fallback_providers`.

## Interpretation / assumptions (no external research allowed)
- `hermes config set KEY VALUE` with dotted keys. Settings, in order:
  providers.tiiny.{name, api, key_env, transport, default_model,
  context_length, models_discovered, extra_body.chat_template_kwargs.
  enable_thinking}, providers.tiiny.models (one JSON value), then
  delegation.backend=tiiny-router last, so the backend is never
  selected without its provider. ASSUMES Hermes parses values as YAML
  (so `262144`/`false`/the JSON map become typed). If it stores strings
  verbatim, the models map needs another route.
- `fallback_providers` (minimax) is user-specific and not set.
- On a failed `config set` the step stops and returns hermes's exit
  code; earlier settings stay applied (no rollback, config is changed
  only through hermes).
- "Takes effect from the next Hermes session" is printed after a
  successful apply.

## Tests
- Items 1, 2, 6 red first. Items 3, 4, 5 passed by construction; each
  verified sensitive by a temporary mutation (skip applying; config
  step writing config.yaml; ignoring the failure for 6).
- Interactive prompt has no automated test (needs a pty). Checked by
  hand with Python `pty.fork()`: `y` -> 10 config set calls, `n` -> 0.
  First attempt hit EAGAIN from `process.stdin.isTTY`; fixed with
  `tty.isatty`.
- `npm test`: 14 node tests + 6 python tests pass. No lint script.

---
<!-- redeye:entry ticket=hermes-plugin-package:10 attempt=1 outcome=done -->
## 2026-11-20 21:58 -- hermes-plugin-package/10 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $1.47. Checked items: "On a healthy install with the backend selected, `doctor` exits zero even when the device cannot be reached", "With an installed file deleted, `doctor` exits non-zero", "With the manifest version differing from the package, `doctor` exits non-zero", "With an installed file edited, `doctor` exits non-zero", "With `delegation.backend` not selecting the routing backend, `doctor` exits non-zero", "When the fake `hermes plugins validate` fails, `doctor` exits non-zero".

### Agent notes
# Ticket 10 notes: doctor

## Item 1 -- done (healthy install, no device -> exit 0)
- src/doctor.ts: list of checks, each PASS/WARN/FAIL line; exit 1 when
  any FAIL. Device check runs a small Python probe that imports the
  installed scripts/tiiny_ctl.py and calls device_key()/inference_base()/
  _request(.../models); unreachable or no key -> WARN.
- src/hermes.ts: hermesOutput() captures stdout (for `config get`).
- src/cli.ts: `doctor` command (takes no options).
- test/harness.ts: fake hermes answers `config get KEY` from the
  `hermesConfig` run option; every run strips TIINY_* env vars and points
  at 127.0.0.1:9 with a fake key. This matters: the dev machine has a
  real TIINY_API_KEY and a reachable device, so without it the device
  check really answered.

## Item 2 -- done (deleted file -> non-zero)
- "installed directory" check: dir exists, readManifest not null, no
  file missing (manifest's `missing` plus any package file absent).
  Red before the check existed.

## Item 3 -- done (version mismatch -> non-zero)
- "version" check: manifest.version vs packageVersion(). Test rewrites
  the manifest's version field. Red first.

## Item 4 -- done (edited file -> non-zero)
- "local edits" check: compareManifest(...).edited must be empty. Red
  first.

## Item 5 -- done (backend not selected -> non-zero)
- "delegation.backend" check runs `hermes config get delegation.backend`
  (hermesOutput) and compares the trimmed stdout (surrounding quotes
  stripped) with `tiiny-router`. Assumption: real `hermes config get KEY`
  prints the bare value on stdout (SKILL.md uses it that way); if it
  prints `key: value`, this check needs adjusting. Tests cover "other
  backend" and "not set", and assert the value was read via the CLI.

## Item 6 -- done (plugins validate fails -> non-zero)
- "hermes plugins validate" check runs `hermes plugins validate <dir>`
  via hermesOutput (stdout captured, stderr shown). Test uses
  hermesFailsOn ['plugins','validate'] and asserts the call targets the
  installed dir. Red first.

## Not done / follow-ups
- Stale copy in the Hermes source tree is not mentioned (ticket says
  "may"); skipped.
- No README.md exists yet in this branch, so doctor is documented only
  in the CLI usage text and AGENTS.md.
- A thrown error inside a check (e.g. `hermes` not on PATH) is reported
  as FAIL for that check, doctor continues.

---
<!-- redeye:entry ticket=hermes-plugin-package:12 attempt=1 outcome=done -->
## 2026-11-20 22:03 -- hermes-plugin-package/12 attempt 1 -- done

Effort: medium. Agent exit: 0. Subagents: 0. Cost: $2.53. Checked items: "No doc or skill file references `~/.hermes/scripts/`, the Hermes source tree install path, the vault, or the sync script", "No doc links to a path that does not exist in the repo", "Every command shown in `README.md` exists in the package's CLI".

### Agent notes
# Ticket 12 notes: docs for the package install

Docs-only ticket: no tests written (docs are not tested, per ticket and
user rules). Verified by grep and a link-resolution script instead.
`npm test` (40 node + 6 python) and test/test_register.py still pass.

## Changes
- New `README.md`: install, config step (--configure / --no-configure /
  non-TTY prints commands), doctor, route-check/ctl, upgrade (install
  again, --force on local edits/foreign dir), uninstall. Every command
  shown exists in src/cli.ts.
- `AGENTS.md`: install steps rewritten for the package; doc-style rule.
- `SKILL.md`: dropped the mesh section (tiers.py has no TIINY_MESH_URL, so
  routing does not work with the mesh on its own), mesh restore/borrow
  paragraphs, mesh scheduled-work subsection, /mesh/fallback and
  mesh._ssl_context mentions, publisher/sync/vault-deploy pitfalls, the
  personal catalogue-publishing line, the dead links (Tiiny/model-catalogue,
  required-set-drift.md). Added a paths note: paths are relative to
  $HERMES_HOME/plugins/tiiny-router/, or use `npx --package hermes-tiiny-router
  hermesrouter ctl|route-check`. "One list, one file" now describes package
  + reinstall.
- references: backend.md install = npx install; verify = doctor/
  route-check/ctl; drift pitfall replaced with "one copy". coding-
  delegation: npx route-check/ctl, no `cd ~/.hermes/skills/...`, mesh
  lifecycle dropped. two-box: mesh lifecycle row and mesh python example
  replaced by per-box HTTP start/stop. lifecycle: hot.md board is optional,
  set via TIINY_VAULT. image-models: npx ctl image.
- single-source-deployment.md deleted.
- docs/: dead links fixed (model-catalogue removed, route_check link ->
  ../tiiny-router/scripts/route_check.py, link to root README), checklist
  uses install/doctor.
- Em dashes replaced with `--` outside fenced code blocks in every touched
  doc (and templates/work-order.md). Example goals "...under the vault"
  -> "...in the notes folder" (checked detect_tier still gives `index`).

## Judgment calls
- `TIINY_VAULT` is still named: it is the real controller setting that
  locates the optional hot.md board (tiiny_ctl.py _find_vault). Prose no
  longer describes a vault deployment. Renaming the env var is code, out
  of scope.
- Arrow `→` kept only inside literals the code prints (`off→low`,
  `code→generalist`, thinking.py f-string quoted in IMPLEMENTATION.md);
  prose arrows replaced. Em dashes kept inside fenced code that quotes
  program output (route_check "levels only ... —", hot.md BUSY block) or
  code.
- Left personal-setup details not named by the checklist (Engraphis cron
  job, OffGrid speech gateway, "scan jobs") alone.
- docs/README.md + IMPLEMENTATION still describe the retired watchdog/hold
  interlock; that is a content-accuracy issue outside this ticket.

---
