# Install workflow fixes

**Status:** ready-for-agent

## Problem Statement

A user who follows the install steps (`install`, add the key, accept the
config step, `doctor`, restart the gateway) ends up with a delegation
backend that Hermes never loads. Hermes plugins in
`$HERMES_HOME/plugins/` are opt-in: only plugins listed in
`plugins.enabled` load, and a user plugin with `kind: backend` is not
default-on. Our install never enables the plugin, so
`delegation.backend: tiiny-router` names a backend that never registers,
and `doctor` still reports every check as passing.

Three smaller problems sit next to that one:

- The config step sends the provider's `models` map, the booleans and the
  context length to `hermes config set` as strings, and it was not known
  whether Hermes stores them as typed values. If the strings were stored
  as they are, `enable_thinking: "false"` would be truthy and the
  per-model context windows would be lost. Checking the Hermes source
  answered this: `hermes config set` coerces `true`/`false`, integers and
  JSON/YAML map literals for keys with no string default, which covers
  every key we set. Nothing in our tests pins that, though.
- The router reads the plan from a fixed `~/.hermes/tiiny-plan.json`,
  while the controller writes it to the base Hermes home derived from
  `HERMES_HOME` (the parent of a `profiles/<name>` directory, else
  `HERMES_HOME` itself). With a non-default `HERMES_HOME` that is not a
  profile, the controller writes one file and the router reads another,
  so the router never sees the plan.
- Error and usage text tell the user to run `hermes-tiiny-router`, but
  the command is `hermesrouter`. A user who copies the suggestion gets
  "command not found".

## Solution

The config step enables the plugin in Hermes as well as setting the
provider and `delegation.backend`, and `doctor` fails when the plugin is
not enabled. The config step's values are pinned by a test so they keep
the forms Hermes coerces into typed values. The router resolves the plan
file the same way the controller does. Every message that names our
command uses the real command.

## User Stories

1. As a Hermes user, I want `install --configure` (or a yes at the
   prompt) to enable the tiiny-router plugin, so that the delegation
   backend I selected is actually loaded after a gateway restart.
2. As a Hermes user who declines the config step, I want the printed
   commands to include the command that enables the plugin, so that
   running them by hand gives a working setup.
3. As a Hermes user, I want `doctor` to fail when the plugin is not
   enabled, or is listed in `plugins.disabled`, and to tell me the
   command that fixes it, so that a passing `doctor` means the backend
   will load.
4. As a Hermes user with a custom `HERMES_HOME`, I want the router and
   the controller to use the same plan file, so that the plan the
   controller writes routes my subtasks.
5. As a Hermes user running a profile, I want the router to keep reading
   the plan from the base Hermes home, so that every profile sees the
   same plan, as it does now.
6. As a user reading an error or the usage text, I want it to name a
   command I can run, so that I can follow it without guessing.
7. As a maintainer, I want a test that pins the exact `hermes config set`
   values, so that a change that would store a boolean or a map as a
   plain string is caught.

## Implementation Decisions

- **Enabling the plugin.** The config step runs
  `hermes plugins enable tiiny-router` as part of applying config, after
  the `hermes config set` calls. It does not write `plugins.enabled`
  with `config set`, because that would replace the user's existing list.
  It stays inside the config step, not in plain `install`, so that
  `install --no-configure` still never changes Hermes config. A failure
  is reported like a failed `config set` (non-zero exit, message that
  config may be partly updated).
- The printed fallback commands (decline or non-interactive) gain the
  same enable command, so the commands-to-run-by-hand list stays the
  full set of changes the config step would make.
- **doctor check.** A new check, named for the plugin being enabled,
  reads `plugins.enabled` and `plugins.disabled` with
  `hermes config get` (through the existing Hermes output helper, never
  by parsing `config.yaml`). It passes when `tiiny-router` is in
  `plugins.enabled` and not in `plugins.disabled`. Otherwise it fails,
  and its detail names `hermes plugins enable tiiny-router`. A value
  that cannot be read is treated as not enabled. It is a fail, not a
  warn, since without it the backend does not load.
- **uninstall** prints `hermes plugins disable tiiny-router` alongside
  the existing command to unselect the backend. It still changes no
  Hermes config itself.
- **Config values.** The values sent to `hermes config set` stay as they
  are. Hermes coerces them (`hermes_cli/config.py`,
  `_coerce_config_set_value`): `false`/`true` become booleans, digits
  become integers, and a JSON object becomes a map, for every key whose
  `DEFAULT_CONFIG` default is not a string. None of the `providers.tiiny`
  keys has a string default. The comment on the settings list records
  this reliance so the next reader does not have to look it up again.
- **Plan file.** The router's default plan path comes from the same rule
  as the controller's shared home: the parent of `HERMES_HOME` when
  `HERMES_HOME` is `.../profiles/<name>`, else `HERMES_HOME`, defaulting
  to `~/.hermes`. `TIINY_PLAN_FILE` still overrides it on both sides.
  The router and the controller do not import each other today; the rule
  is short, so it is duplicated in the router with a comment pointing at
  the controller's version. Docstrings and `references/backend.md` that
  say `~/.hermes/tiiny-plan.json` are updated to say the plan lives in
  the base Hermes home.
- **Command name.** The usage text, the passthrough "not installed"
  error and the top-level error prefix use
  `npx --package hermes-tiiny-router hermesrouter <command>` where they
  suggest a command, and `hermesrouter` as the program name. The
  uninstall message that says a directory "was not installed by
  hermes-tiiny-router" names the package, which is correct, and stays.

## Testing Decisions

- Good tests here assert on what a user or Hermes would observe: exit
  codes, the `hermes` calls the CLI makes, and files in the Hermes home.
  They do not assert on output text (per AGENTS.md and the user's rules).
- **Seam 1: the CLI as a subprocess** (`test/harness.ts`: `makeEnv()`,
  `run()`, `hermesCalls()`, `hermesConfig`, `hermesFailsOn`). This covers
  the enable call, the doctor check and the config values.
  - `install --configure` makes a `plugins enable tiiny-router` call, and
    makes it after the `config set` calls.
  - `install --no-configure` and the non-interactive default make no
    `plugins enable` call (extends the existing guard tests).
  - When `hermesFailsOn: ['plugins', 'enable']`, `install --configure`
    exits non-zero.
  - `doctor` exits non-zero when `hermesConfig` gives a `plugins.enabled`
    without `tiiny-router`, or one with it but `plugins.disabled` also
    listing it, and exits zero (other checks passing) when it is enabled.
  - The `config set` calls carry `false` for the two booleans, an integer
    literal for `context_length`, and a `models` value that parses as a
    JSON object whose keys are the tier model ids. This pins the forms
    Hermes coerces. Prior art: `test/config.test.ts`.
  - Command name: the passthrough test that runs `ctl` before install
    already exists in `test/passthrough.test.ts`; no text assertion is
    added for the command name, since that would be a text test. The
    change is checked by review.
- **Seam 2: the backend imported from a copied tree** (prior art:
  `test/test_installed_tree.py`, `test/test_register.py`, with the stub
  `agent.delegation_provider` module). With `TIINY_PLAN_FILE` unset:
  - `HERMES_HOME=/tmp/x/home` gives a router plan path under
    `/tmp/x/home`, and it equals the controller's default plan path.
  - `HERMES_HOME=/tmp/x/hermes/profiles/work` gives a path under
    `/tmp/x/hermes`, equal to the controller's.
  - `TIINY_PLAN_FILE` set wins on both sides.
  A new Python test file must be added to the `test` script in
  `package.json` or it never runs.
- Each new guard test is checked to go red by briefly breaking the code,
  restoring from a copy rather than `git checkout`.

## Out of Scope

- Moving the profile and shared-home logic into a module both the router
  and the controller import.
- Changing what `uninstall` does to Hermes config (it still only prints
  commands).
- Verifying the enable step against every Hermes version; this targets
  the Hermes whose source was read (plugins opt-in, `hermes plugins
  enable <name>` present).
- Any change to the tier table or model ids.

## Further Notes

- Source for the Hermes behavior: `hermes_cli/config.py`
  (`_coerce_config_set_value`), `hermes_cli/config_set_scalars.py`,
  `hermes_cli/plugins_cmd.py` (`cmd_enable`, `_default_on`: only bundled
  plugins and flat user plugins with `kind: model-provider` are on
  without a `plugins.enabled` entry), and the plugin listing's note that
  plugins are opt-in. Our `plugin.yaml` declares `kind: backend`.
- `hermes plugins enable` may prompt for consent in some cases
  (`_enable_consent`). The harness gives the CLI no terminal, so check by
  hand that it does not block an interactive install for this plugin.
- README and AGENTS.md install steps should mention that the config step
  also enables the plugin.
- Origin: findings from a low-effort `/code-review` of the install
  workflow on the `refactor` branch.
