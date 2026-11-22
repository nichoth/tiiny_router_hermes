# 02: Config step enables the plugin

**What to build:** Hermes user plugins are opt-in, so a selected
`delegation.backend: tiiny-router` never loads unless the plugin is in
`plugins.enabled`. The config step (`install --configure`, or a yes at
the prompt) runs `hermes plugins enable tiiny-router` after the
`hermes config set` calls. It never writes `plugins.enabled` with
`config set`, since that would replace the user's list. A failed enable
is reported like a failed `config set`: non-zero exit and a message that
Hermes config may be partly updated. The commands printed when the step
is declined or non-interactive include the enable command, so that list
stays the full set of changes. `uninstall` prints
`hermes plugins disable tiiny-router` beside its existing hint, and still
changes no Hermes config itself. README and AGENTS.md install steps say
the config step also enables the plugin.

**Blocked by:** 01 (same files; avoids a merge conflict)
**Touches:** `src/config.ts` (`applyConfig`, `configCommands`,
`printCommands`), `src/uninstall.ts`, `src/hermes.ts` (`runHermes`),
`test/config.test.ts`, `test/install.test.ts`, `test/uninstall.test.ts`,
`README.md`, `AGENTS.md`

**Status:** done

- [x] `install --configure` makes a `plugins enable tiiny-router` call,
      after every `config set` call
- [x] `install --no-configure` makes no `plugins enable` call
- [x] `install` with no flag in a non-interactive run makes no
      `plugins enable` call
- [x] With `hermesFailsOn: ['plugins', 'enable']`, `install --configure`
      exits non-zero
- [x] `uninstall` still makes no `hermes config` or `hermes plugins`
      calls
- [x] Checked by hand under a Python `pty.fork()` that the enable step
      does not block an interactive install on a consent prompt
      (`_enable_consent` in `hermes_cli/plugins_cmd.py`)
- [x] Each new guard test is checked to go red by briefly breaking the
      code (restore from a copy, not `git checkout`)
