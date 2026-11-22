# 01: Pin the `hermes config set` values in a test

**What to build:** a guard test that pins the exact values the config step
sends to `hermes config set`, so a change that would store a boolean or
the `models` map as a plain string is caught. Hermes coerces
`true`/`false`, integer literals and JSON/YAML map literals into typed
values for keys with no string default (`hermes_cli/config.py`,
`_coerce_config_set_value`); none of the `providers.tiiny` keys has a
string default. Record that reliance in the comment on `SETTINGS`. No
behavior change. See the spec's "Config values" decision.

**Blocked by:** None (can start immediately)
**Touches:** `src/config.ts` (`SETTINGS` comment), `test/config.test.ts`,
`test/harness.ts` (`run`, `hermesCalls`)

**Status:** done

- [x] `install --configure` sends `false` for
      `providers.tiiny.models_discovered` and for
      `providers.tiiny.extra_body.chat_template_kwargs.enable_thinking`
- [x] `install --configure` sends an integer literal for
      `providers.tiiny.context_length`
- [x] `install --configure` sends a `providers.tiiny.models` value that
      parses as a JSON object whose keys are the tier model ids, each with
      an integer `context_length`
- [x] Each new assertion is checked to go red by briefly breaking the
      value in `SETTINGS` (restore from a copy, not `git checkout`)
