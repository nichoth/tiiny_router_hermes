# 09: `uninstall`

**What to build:** `hermesrouter uninstall` removes the installed
plugin directory, and only if its manifest identifies it as installed by
this package. The rest of the Hermes home is untouched. It does not
revert config; it prints the `hermes config set` command to unselect the
backend.

**Blocked by:** 05

**Touches:** `src/` (uninstall), `test/`

**Status:** done

- [x] After `install`, `uninstall` removes `plugins/tiiny-router/` and
      exits zero
- [x] `uninstall` leaves every other file in the `HERMES_HOME`
      unchanged, including `config.yaml`, the secrets file, and other
      plugins
- [x] `uninstall` on a directory with no manifest exits non-zero and
      leaves it in place
- [x] `uninstall` makes no `hermes config set` call
