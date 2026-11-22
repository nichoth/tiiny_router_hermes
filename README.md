# tiiny-router-hermes

Tiiny model routing for the Hermes harness, a fork of
[garciacionet-alt/AI_Articles](https://github.com/garciacionet-alt/AI_Articles/tree/main/tiiny-model-routing).

This package is a plugin for the
[Hermes harness](https://hermes-agent.nousresearch.com/).
It chooses which model does each job. Each specialist model gets the task's goal
and context without inheriting the manager's full conversation history.
See
[Hermes delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation).

This installs global config, in `~/.hermes/` -- a Hermes plugin,
controller scripts, and a skill for delegating tasks on
a Tiiny hardware device. (Hermes loads plugins from `$HERMES_HOME/plugins/`.)

We are using Hermes's pluggable `DelegationProvider` to select
a model, provider, and reasoning settings for each subtask.


<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Install](#install)
- [Quickstart](#quickstart)
  * [1. Install](#1-install)
  * [2. Configure](#2-configure)
  * [3. Check](#3-check)
  * [4. Restart](#4-restart)
- [What is the Hermes harness?](#what-is-the-hermes-harness)
- [Request flow](#request-flow)
- [When Tiiny routing applies](#when-tiiny-routing-applies)
- [Reducing model swaps](#reducing-model-swaps)
- [The config step](#the-config-step)
  * [Settings written by the installer](#settings-written-by-the-installer)
- [Check the install](#check-the-install)
- [Upgrade](#upgrade)
- [Uninstall](#uninstall)
- [More](#more)

<!-- tocstop -->

</details>

## Prerequisites

* [Hermes](https://hermes-agent.nousresearch.com/) installed
* a [tiiny device](https://tiiny.ai/)
* the `tiiny` CLI, signed in (see [4. tiiny CLI](#4-tiiny-cli))
* `python3` on `PATH`

## Install

The npm package is `hermes-tiiny-router`. The command is `hermesrouter`.
The install command is `npx hermesrouter install`.

```sh
npm i -D hermes-tiiny-router
```

Install the Hermes plugin, then choose whether to configure it (see
[the config step](#the-config-step)):

```bash
npx hermesrouter install
```

This copies a directory to `$HERMES_HOME/plugins/tiiny-router/`
(`HERMES_HOME` defaults to `~/.hermes`). It holds the routing backend, the
controller scripts and the skill, which Hermes serves as
`tiiny-router:tiiny-model-routing`. The installer then runs
`hermes plugins validate` on the directory.

Installing the npm dependency alone does not install or configure the
Hermes plugin. **The plugin is installed at the Hermes user level**,
even when the npm dependency is local to a project.

Then add the device key and the rest of the settings
in [2. Configure](#2-configure).

## Quickstart

### 1. Install

```sh
npm i -D hermes-tiiny-router
```

#### Install Plugin

```sh
npx hermesrouter install
```

It changes these files, in `$HERMES_HOME` (default `~/.hermes`):

* `~/.hermes/plugins/tiiny-router/` -- the plugin files are copied here,
  along with an install manifest, `.hermes-tiiny-router-manifest.json`.
  On upgrade, files the old version installed but the new one lacks are deleted,
  unless you edited them.
* Hermes config, only if you accept the config step
  (it asks, or pass `--configure`). It runs `hermes config set` to
  add the `tiiny` provider (`providers.tiiny.*`) and set
  `delegation.backend: tiiny-router` and `delegation.provider: tiiny`,
  then runs `hermes plugins enable tiiny-router`.
  Pass `--no-configure` to skip this.

It also runs `hermes plugins validate` on the plugin directory, which
changes nothing. It never reads or writes `~/.hermes/.env`.

### 2. Configure

Four things:

#### 1. Device Key

Need an API key either in the shell env or in the file `~/.hermes/.env`.

```sh
# ~/.hermes/.env
TIINY_API_KEY="..."
```

#### 2. Delegation Provider

The installer's config step defines the `tiiny` provider and selects it
for delegated subtasks. Accept the prompt during `npx hermesrouter install`,
or pass `--configure`, to handle this automatically.

If you configured the provider yourself, select it with:

```sh
hermes config set delegation.provider tiiny
```

Hermes also accepts the canonical form, `custom:tiiny`. If
`delegation.base_url` is set, it takes precedence over the provider,
so clear it. See [When Tiiny routing applies](#when-tiiny-routing-applies).

#### 3. Network

The provider talks to `http://openai.api.tiiny/v1`, and the controller
manages models through `http://tiinyhost.local`. Both names must resolve
from the machine running Hermes, which normally means being on the same
network as the device.

#### 4. tiiny CLI

The controller loads and unloads models with the `tiiny` CLI, expected at
`~/.local/tiiny/bin/tiiny` (set `TIINY_BIN` to use another path). Sign it
in to the device first; a signed-out CLI cannot load models. Check it
with `tiiny top`.

The controller can load over the device's HTTP API instead, but only with
a device registry (`devices.py` beside `tiiny_ctl.py` or in
`~/.hermes/mesh/`), which this package does not ship. Without the CLI,
the backend still picks a model but cannot load it. The child request
then fails with a 404, and goes to a fallback provider if one is set.

#### Optional

* **A fallback provider.** With `delegation.fallback_providers` set, a
  child whose request to the device fails runs on that provider instead.
  The installer does not set it. Example:
  ```sh
  hermes config set delegation.fallback_providers \
    '[{"provider": "minimax", "model": "MiniMax-M3"}]'
  ```

* **A different device address.** The controller scripts read
  `TIINY_HOST` (management) and `TIINY_BASE_URL` (inference) from the
  environment or `~/.hermes/.env`. Child requests go to
  `providers.tiiny.api`, so change that too with `hermes config set`.
  The backend's own residency check always uses
  `http://openai.api.tiiny/v1` (`tiers.py`), so it does not follow
  either setting.
* **Skip loading on route.** By default the backend loads the chosen
  model before returning a route. Export `TIINY_ENSURE_ON_ROUTE=false` in
  the environment Hermes starts in to skip that. The backend reads this
  from the process environment only, not from `.env`.

### 3. Check

```sh
npx hermesrouter doctor
npx hermesrouter route-check "index every file in the notes folder"
```

`doctor` exits non-zero on a failed check. An unreachable device is only a
warning, so read that line if the device should be up.

### 4. Restart

The backend selection takes effect in the next Hermes session. Restart
the gateway or start a new session.


## What is the Hermes harness?

[Hermes Agent][hermes] is a harness from Nous Research. It provides the
execution loop, model-provider integration, and session storage, along
with persistent memory, reusable skills, scheduled tasks, messaging
integrations, and subagent delegation. Its learning features include
saving and improving skills and memories across sessions.

This plugin selects models for subtasks.

## Request flow

With delegation configured to use Tiiny:

```text
Your request
  -> Hermes manager agent
  -> delegate_task(goal, context)
  -> Tiiny routing backend
  -> selected model on the Tiiny device
  -> result returned to the manager
```

Hermes supplies the child agent's execution loop, tools, and isolated
conversation. This plugin selects the model, taking the task, the batch
plan, and the device's loaded models into account. See
[Hermes delegation][hermes-delegation] for how child agents run and return
their results.

## When Tiiny routing applies

The intended scope is **Hermes delegating work to Tiiny hardware**. The
manager can use a cloud model -- it does not need to run on Tiiny. Installing
this package does not change how other agent harnesses route tasks.

Hermes calls this router for `delegate_task` when its configuration selects
`delegation.backend: tiiny-router`. That selection persists across new
sessions using the same configuration. Changing the manager's model or
provider does not turn the router on or off.

**The current code does not enforce a Tiiny-only guard.** The skill tells
the manager to use it only with Tiiny, but the backend does not validate
the delegation provider or endpoint before choosing a Tiiny model and
contacting the device. It copies the delegation configuration into the
returned route, then sets the model and reasoning overrides. Selecting
this backend alone does not bind the child to the `tiiny` provider.

The installer's config step adds the provider and sets
`delegation.provider: tiiny` in the same Hermes configuration. Accept the
config prompt or pass `--configure` to apply both selections.

Check existing delegation overrides too: `delegation.base_url` takes
precedence over the provider. Without a delegation provider or endpoint,
children inherit the manager's provider and credentials. An unreachable
device does not automatically disable this backend, and configured
fallback providers can send failed child tasks to a cloud model.

Use a dedicated [Hermes profile][hermes-profiles] for Tiiny work, with the
backend set to `default` in configurations used for other providers. Set
`HERMES_HOME` explicitly when installing for a profile so the package and
its `hermes` subprocesses target the same home. For example, after creating
a profile named `tiiny`:

```bash
HERMES_HOME="$HOME/.hermes/profiles/tiiny" \
  npx hermesrouter install --configure
```

This separates the configurations; a runtime check would still be needed
to guarantee that this backend cannot be used with a non-Tiiny route.

## Reducing model swaps

The package helps avoid repeated loading and unloading in two ways:

- **Reuse loaded models.** For each task, the router first considers its
  planned model if loaded, then loaded candidates in the task's tier,
  then the loaded generalist. Without a loaded match, it chooses the
  tier's default; if residency cannot be read, it uses the generalist
  unless a plan supplies a model. By default it calls the controller's
  `ensure_model` before returning the route. An already loaded model is
  checked and reused rather than reloaded.
- **Plan model-loading waves.** Given several goals, the controller's
  `plan` command chooses their models, collects the distinct models,
  and packs them into waves whose combined NPU share fits within 100%.
  Models already loaded are packed first. Every task assigned to a
  particular model gets that model's wave number. A wave can contain
  several models if they fit together.

For example, independent goals that would alternate between two models
that cannot fit together can instead run all work for one model before
loading the other. Loading a wave keeps other resident models when there
is room and skips loading models that are already resident.

**Grouping is planned, but execution depends on the manager following the
skill.** The router handles one task at a time; it does not maintain a
queue or reorder arbitrary `delegate_task` calls. The installed skill
instructs the manager to plan the batch, reserve the device, load a wave,
finish that wave's work, then load the next. The skill also instructs the
manager to run only one generation-heavy child at a time. After the batch,
`release` restores the controller's required models and clears the plan
and lock; restoration can itself require loading models.

Ad hoc delegation still gets model selection and on-demand loading, but
does not get automatic grouping across separate calls. Batching reduces
swaps when the work permits it; it does not eliminate their time cost.
See the [routing skill](tiiny-router/SKILL.md) for the full procedure.

## The config step

`npx hermesrouter install` copies the plugin and validates it, then offers
to change Hermes configuration through `hermes config set`.

```bash
npx hermesrouter install                 # prompts in a terminal
npx hermesrouter install --configure     # applies without asking
npx hermesrouter install --no-configure  # installs files only
```

Without a terminal and without either flag, it skips configuration and
prints the commands. Declining the prompt or using `--no-configure` also
leaves settings unchanged.

These are persistent Hermes user settings, not settings in the npm
project. With the default Hermes home/profile they live in
`~/.hermes/config.yaml`; a named profile has its own configuration. The
installer copies files to `$HERMES_HOME/plugins/tiiny-router/` (falling
back to `~/.hermes`) and lets the invoked `hermes` command choose its
configuration. Use an explicit `HERMES_HOME` to keep those targets aligned
when working with profiles.

### Settings written by the installer

The config step sets `delegation.backend` to `tiiny-router` and
`delegation.provider` to `tiiny`, enables the plugin with
`hermes plugins enable tiiny-router`, and writes the following fields
under `providers.tiiny`:

| Field | Value |
| --- | --- |
| `name` | `tiiny` |
| `api` | `http://openai.api.tiiny/v1` |
| `key_env` | `TIINY_API_KEY` |
| `transport` | `chat_completions` |
| `default_model` | `Qwen/Qwen3.6-35B-A3B` |
| `context_length` | `262144` |
| `models_discovered` | `false` |
| `extra_body.chat_template_kwargs.enable_thinking` | `false` |
| `models` | The six model IDs and context lengths in [config.ts][config]. |

The `models` map is written as one value. These writes replace existing
values at the listed keys, including any previous backend or delegation
provider selection and customized Tiiny model map. Other configuration
keys are left as they are.
If a `hermes config set` call fails, earlier changes remain applied; the
command reports the failure without rolling them back.

The installer does not select the manager's model or provider, set
`delegation.base_url` or `delegation.fallback_providers`, download models,
or load/unload them.
The installer itself does not edit `config.yaml` directly, and it never
edits `.env`; add `TIINY_API_KEY` yourself as described above. The skill
is served from the plugin directory, without a separate copy under
`~/.hermes/skills/`.

A saved `delegation.backend` takes effect from the next Hermes session, not
the current one. Restart the gateway or start a new session.

## Check the install

```bash
npx hermesrouter doctor
```

`doctor` prints a pass, warn or fail line for each check: the installed
directory is complete, its version matches the package, no installed file
was edited, `hermes plugins validate` passes, `delegation.backend` selects
`tiiny-router`, the plugin is enabled in `plugins.enabled`, `python3` is
present, and the device answers. It exits
non-zero when any check fails. A device that cannot be reached is a
warning, not a failure.

To see where a goal would be routed, and to drive the controller, run the
installed scripts through the package:

```bash
npx hermesrouter route-check "index every file in the notes folder"
npx hermesrouter route-check --all
npx hermesrouter ctl status
npx hermesrouter ctl ensure --model "Qwen/Qwen3.6-35B-A3B"
```

`route-check` and `ctl` run `scripts/route_check.py` and
`scripts/tiiny_ctl.py` from the installed directory with the system
`python3`, passing the arguments and the exit code through.

## Upgrade

Run `install` again with the newer package:

```bash
npm install -D hermes-tiiny-router@latest
npx hermesrouter install
```

`install` keeps a manifest of what it wrote. If a file in the installed
directory was edited since then, or the directory was not installed by this
package (for example an older copy made by hand), it lists the problem and
stops. Re-run with `--force` to overwrite.

## Uninstall

```bash
npx hermesrouter uninstall
```

This removes `$HERMES_HOME/plugins/tiiny-router/`, and only when its
manifest shows this package installed it. It does not change Hermes
config; it prints the commands that unselect the backend and disable the
plugin.

To restore ordinary delegation, run these in the same Hermes configuration
before starting another session:

```bash
hermes config set delegation.backend default
hermes plugins disable tiiny-router
```

Uninstall does not restore previous settings or remove `providers.tiiny`.
The delegation provider selection and any endpoint override also remain.

## More

- [tiiny-router/SKILL.md](tiiny-router/SKILL.md) -- the procedure the
  manager agent follows: pick, fit, reserve, load, supervise, verify,
  release.
- [docs/README.md](docs/README.md) -- why routing by task shape pays off.
- [docs/PATTERN.md](docs/PATTERN.md) -- the routing pattern in full.
- [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) -- the backend, the
  controller and an end-to-end checklist.

[config]: src/config.ts
[hermes]: https://hermes-agent.nousresearch.com/
[hermes-delegation]: https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation
[hermes-profiles]: https://hermes-agent.nousresearch.com/docs/user-guide/profiles
[pi]: https://github.com/badlogic/pi-mono
