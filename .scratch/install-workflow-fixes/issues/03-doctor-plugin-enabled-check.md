# 03: `doctor` fails when the plugin is not enabled

**What to build:** a passing `doctor` should mean the backend will load.
Add a check, named for the plugin being enabled, that reads
`plugins.enabled` and `plugins.disabled` with `hermes config get`
(through `hermesOutput`, never by parsing `config.yaml`). It passes when
`tiiny-router` is in `plugins.enabled` and not in `plugins.disabled`.
Otherwise it fails (not warns), and its detail names
`hermes plugins enable tiiny-router`. A value that cannot be read counts
as not enabled. Existing doctor tests that expect exit 0 need
`plugins.enabled` in their `hermesConfig`.

**Blocked by:** None (can start immediately)
**Touches:** `src/doctor.ts` (`checks`), `src/hermes.ts` (`hermesOutput`),
`test/doctor.test.ts`

**Status:** done

- [x] `doctor` exits non-zero when `plugins.enabled` does not list
      `tiiny-router`
- [x] `doctor` exits non-zero when `plugins.enabled` lists `tiiny-router`
      and `plugins.disabled` also lists it
- [x] `doctor` exits non-zero when `plugins.enabled` cannot be read
- [x] `doctor` exits zero when `tiiny-router` is enabled, not disabled,
      and the other checks pass
- [x] Each new guard test is checked to go red by briefly breaking the
      code (restore from a copy, not `git checkout`)
