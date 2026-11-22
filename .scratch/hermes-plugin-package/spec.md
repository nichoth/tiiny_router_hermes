# Spec: Repackage the repo as an npm-installed Hermes plugin

**Status:** ready-for-agent

## Problem Statement

This repo is a grab bag of patterns and write-ups (bot identity, agent
memory commons, image agency, mesh, two-box setups, and more). Only one of
them, Tiiny model routing, is something people actually install and run,
and installing it is a manual, error-prone process. The routing backend is
copied into the Hermes source tree, where every Hermes update erases it.
The controller and the skill are copied to two other places. The copies
drift apart, each side finds the others by searching a hardcoded list of
paths, and a partial copy makes the routing backend silently vanish from
Hermes rather than fail loudly. The docs describe the original author's
personal vault and symlink deployment, which nobody else has.

## Solution

The repo becomes a single npm package whose only purpose is to add Tiiny
model routing to the Hermes harness. A user runs one command
(`npx --package hermes-tiiny-router hermesrouter install`) that copies one
directory into the Hermes user plugin directory. That directory holds the
routing backend, the
controller and the skill. The installer offers to select the routing
backend in Hermes config, and a `doctor` command tells the user whether the
install is complete and healthy. Hermes updates no longer erase the
install, and there is exactly one copy of everything. See ADR 0001.

## User Stories

1. As a Hermes user, I want to install Tiiny model routing with one npm
   command, so that I do not have to copy files into three places by hand.
2. As a Hermes user, I want the install to survive Hermes updates, so that
   delegation does not silently fall back to the paid provider after an
   upgrade.
3. As a Hermes user, I want the installer to offer to select the routing
   backend in my Hermes config, so that I do not have to look up the config
   keys.
4. As a Hermes user who manages my own config, I want to skip the config
   step, so that the installer only copies files.
5. As a Hermes user, I want the installer to never touch my secrets file,
   so that my device key stays where I put it.
6. As a Hermes user who edited an installed file, I want re-installing to
   refuse to overwrite my edit unless I force it, so that I do not lose
   work.
7. As a Hermes user upgrading the package, I want to run `install` again
   and get the new version, so that upgrading is the same as installing.
8. As a Hermes user, I want `uninstall` to remove only what the installer
   put there, so that the rest of my Hermes home is untouched.
9. As a Hermes user, I want a `doctor` command that checks the install,
   its version, the Hermes config, `python3`, and whether the device can
   be reached, so that I can tell why delegation is not routing.
10. As a Hermes user, I want to run the controller and the route checker
    through the package's own command, so that I do not need to know the
    install path.
11. As a manager agent, I want the skill available as soon as the routing
    backend is enabled, so that I know how to drive the controller.
12. As a Hermes user with a non-default `HERMES_HOME`, I want the installer
    to respect it, so that profiles and custom homes work.
13. As a Windows user, I want npm to tell me the package is unsupported,
    so that I do not end up with a half-working install.

## Implementation Decisions

### Repo contents

- Everything outside `tiiny-model-routing/` is deleted in an ordinary
  commit, no history rewrite. These survive: `LICENSE`, `AGENTS.md`,
  `docs/agents/`, `.agents/`, `.claude/`, `.gitignore`, `.gitattributes`,
  `CONTEXT.md`, `docs/adr/`, `.scratch/`, and the
  `@substrate-system/redeye` devDependency.
- The contents of `tiiny-model-routing/` move to the repo root, which
  becomes the package.
- Duplicates are removed: the top-level scripts folder is identical to the
  skill's scripts, and the examples plugin folder is identical to the
  skill's plugin. One copy of each remains.

### The installed directory (one directory, see ADR 0001)

- Install target: `$HERMES_HOME/plugins/tiiny-router/`, defaulting
  `HERMES_HOME` to `~/.hermes`. Not the Hermes source tree.
- The routing backend, the controller scripts and the skill (`SKILL.md`,
  references, templates) are all in this one directory. The repo's source
  layout mirrors it, so the installer copies one tree.
- The routing backend, the controller and the route checker find each
  other and the shared tier table relative to their own file location
  only. The current multi-path search lists, including entries that point
  at deleted folders and at the Hermes source tree, are removed.
- The routing backend's `register(ctx)` registers the delegation backend
  as today and also registers the skill through `ctx.register_skill`
  under the name `tiiny-model-routing`, so it resolves as
  `tiiny-router:tiiny-model-routing`. Nothing is written under
  `~/.hermes/skills/`.

### The package's command (`hermesrouter`)

- Delivered through `bin` only. No `postinstall` hook.
- Written in TypeScript, compiled for Node >= 20, no runtime
  dependencies.
- `package.json` declares `"os": ["darwin", "linux"]` and
  `"engines": {"node": ">=20"}`.
- Subcommands:
  - `install [--force] [--configure | --no-configure]`: copies the tree.
    It is idempotent. Before overwriting, it compares installed files
    against a manifest of hashes written at the previous install; any file
    whose hash differs from that manifest is a local edit, and the install
    stops with a list of those files unless `--force` is given. After
    copying it runs `hermes plugins validate` on the directory. Config
    step: interactive runs prompt; `--configure` applies without
    prompting; `--no-configure` skips; non-interactive runs without a flag
    skip and print the commands instead.
  - `uninstall`: removes the installed directory only, and only if its
    manifest identifies it as installed by this package. It does not
    revert config; it prints the `hermes config set` command to unselect
    the backend.
  - `doctor`: checks, each with a pass/fail line and a non-zero exit on
    any failure: the directory exists and is complete; the installed
    version matches the package; no file differs from the manifest;
    `hermes plugins validate` passes; `delegation.backend` selects the
    routing backend; `python3` is present; the device answers. A
    device that cannot be reached is a warning, not a failure.
  - `route-check ...` and `ctl ...`: run the installed route checker and
    controller with the system `python3`, passing arguments and exit code
    through.
- Config is changed only through `hermes config set`, never by editing
  `config.yaml`. The secrets file is never read or written.
- The config step sets `delegation.backend` to the routing backend and
  adds the `tiiny` provider entries described in the backend reference.

### Versioning

- `package.json` is the only source of the version. An npm `version`
  script stamps it into `plugin.yaml` and the skill's frontmatter. The
  install manifest records it, and `doctor` compares against it.
- The original attribution ("Gary Garcia (garciacionet-alt), Hermes
  Agent") is kept in `package.json` `contributors`.

### Docs

- A new short `README.md` covers install, the config step, `doctor`,
  upgrade and uninstall.
- The long-form article (`README`), `PATTERN.md` and `IMPLEMENTATION.md`
  move to `docs/`. Links to deleted folders are removed or rewritten.
- `SKILL.md` and its references are rewritten wherever they describe the
  vault, the sync script, symlinked copies, `~/.hermes/scripts/`, or the
  Hermes-source-tree install path: the package is the source and the
  installer deploys it. `single-source-deployment.md` is deleted. Mesh,
  two-box and image-agency references stay only where routing works with
  them on its own, and are dropped otherwise.
- Controller paths in the skill are written relative to the installed
  directory or as the package's `ctl`/`route-check` commands.

## Testing Decisions

- Good tests here exercise external behavior: what the command does to a
  Hermes home and which Hermes commands it runs. They do not assert on
  output text, internal helpers, or file layout beyond what a user or
  Hermes relies on.
- Runner: Node's built-in `node:test`, tests in TypeScript.
- Seam 1, the package's command run as a subprocess. Each test gets a
  temporary `HERMES_HOME` and a fake `hermes` executable first on `PATH`
  that records its arguments and can be told to fail. Covers: install
  creates a complete directory with the stamped version; re-install is
  safe; an edited file blocks install without `--force` and is replaced
  with it; `--configure` calls `hermes config set` for the backend and
  `--no-configure` does not; `config.yaml` and the secrets file are never
  modified; uninstall removes only its own directory and refuses a
  directory it did not install; `doctor` exits zero on a healthy install
  and non-zero on a missing file, a version mismatch, an edited file, or
  an unselected backend.
- Seam 2, the routing backend's `register(ctx)` called from Python with a
  fake `ctx`. Covers: it registers the delegation backend and the skill,
  and the skill path resolves inside the installed directory. Run with
  the system `python3` from the Node test suite or as a standalone script
  invoked by `npm test`.
- No prior art: the repo has no tests for this code today.

## Out of Scope

- Changing routing behavior, the tier table, reasoning-mode control, or
  the controller's lifecycle logic. One exception: the `code` tier's
  `deepreinforce-ai/Ornith-1.0-35B` is replaced by
  `ornith-ai/Ornith-1.5-35B-A3B-Turbo` (54% NPU, 262144 context), in
  the tier table and everywhere the package mentions it.
- Tests against a real Tiiny device or a real Hermes install.
- Publishing to the npm registry (the package is made publishable; the
  publish itself is a separate step).
- Windows support.
- A pip package or a `hermes plugins install` git route (see ADR 0001).
- Migrating or deleting a user's existing hand-installed copies outside
  the user plugin directory. `doctor` may mention a stale copy in the
  Hermes source tree, but does not remove it.

## Further Notes

- On the author's machine, a hand-installed copy already lives at the
  target directory without a manifest. `install` treats a directory with
  no manifest as foreign and stops unless `--force` is given.
- A saved `delegation.backend` takes effect from the next Hermes session,
  not the current one; the installer says so after configuring.
- Glossary terms (package, routing backend, controller, skill) are in
  `CONTEXT.md`.
