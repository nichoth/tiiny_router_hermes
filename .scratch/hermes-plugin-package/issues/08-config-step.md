# 08: Config step

**What to build:** The installer offers to select the routing backend
in Hermes config. Config is changed only through `hermes config set`:
it sets `delegation.backend` to the routing backend and adds the
`tiiny` provider entries described in the backend reference. Flags:
`--configure` applies without prompting; `--no-configure` skips;
an interactive run with neither flag prompts; a non-interactive run
with neither flag skips and prints the commands instead. After
configuring, the installer says the change takes effect from the next
Hermes session. `config.yaml` and the secrets file are never read or
written.

**Blocked by:** 03, 05

**Touches:** `src/` (install, config step), `references/backend.md`
(source of provider entries), `test/`

**Status:** done

- [x] `install --configure` calls `hermes config set` for
      `delegation.backend` with the routing backend
- [x] `install --configure` calls `hermes config set` for the `tiiny`
      provider entries
- [x] `install --no-configure` makes no `hermes config set` call
- [x] A non-interactive `install` with neither flag makes no
      `hermes config set` call
- [x] No mode modifies `config.yaml` or the secrets file
- [x] `install --configure` exits non-zero when `hermes config set`
      fails
