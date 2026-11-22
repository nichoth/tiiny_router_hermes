<!-- redeye:review from=e44ac0be270b9ed2c3b606a8d1b45ec66fcd3e0e to=f12fafb710641ff17f8653525767c8b5ccb9e325 status=fixed -->
## 2026-11-20 22:11 -- review e44ac0b..f12fafb -- 2 of 2 fixed
- [x] `npm test` never runs the Seam 2 `register(ctx)` test, so a broken skill registration passes CI
    package.json:24 -- the `test` script runs `node --test test/*.test.ts` and `python3 -B test/test_installed_tree.py` only; `test/test_register.py` (the only test that `register` registers the delegation provider and `tiiny-model-routing` with a `SKILL.md` path inside the installed directory) is not invoked. The spec requires Seam 2 to run "from the Node test suite or as a standalone script invoked by `npm test`". Delete `ctx.register_skill(SKILL_NAME, SKILL_PATH)` from tiiny-router/__init__.py:575 or point `SKILL_PATH` at a missing file and `npm test` still reports all green.
- [x] An upgrade leaves files the new version dropped in the installed directory, and nothing reports them
    src/install.ts:53-59 -- install copies the new `listTree(SOURCE_TREE)` over the target and writes a manifest of only those files; files listed in the previous manifest but absent from the new source tree are never removed. Example: v2.1.0 installs `scripts/tiiny-swap.sh`; a later version deletes it; after `install` the old script is still in `$HERMES_HOME/plugins/tiiny-router/scripts/`, is no longer in the manifest, so `doctor` (src/doctor.ts:72-79) and the edit check ignore it, and the skill or a user can still run the stale copy. Removing previous-manifest entries that the new tree lacks (when they still match their recorded hash) would keep the install an exact copy.

### Fix
- attempts: 1 of 4
- effort: medium
- agent exit code: 0
- result: merged

# Notes

## Finding 1: npm test never runs test_register.py -- DONE
- Appended `&& python3 -B test/test_register.py` to the `test` script in
  package.json.
- Red/green shown by hand: replacing `ctx.register_skill(...)` in
  tiiny-router/__init__.py with `pass` -> old script exit 0, new script
  exit 1 (2 failures); restored file -> exit 0.
- Gotcha: BSD sed does not understand `\s`; my first break attempt silently
  did nothing. Use python for scratch edits.

## Finding 2: upgrade leaves dropped files behind -- DONE
- src/install.ts: new `removeDropped(target, files)` runs before the copy.
  For each path in the previous manifest that the new source tree lacks,
  it deletes the file if its hash still matches the manifest, then removes
  directories that became empty. Edited files (only reachable with
  --force, since an edit blocks install otherwise) and files no manifest
  lists are kept. Paths resolving outside the plugin dir are skipped.
- test/install.test.ts: "upgrading removes files the new version no
  longer ships" (red before the fix) and a guard "upgrading keeps files
  the user added that no install wrote" (checked red by temporarily making
  removal walk the whole installed tree).
- Interpretation: "exact copy" applies to files we installed; user-added
  files are left alone, matching the finding's "when they still match
  their recorded hash".
---
