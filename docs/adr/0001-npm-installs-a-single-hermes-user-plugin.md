# Ship as one Hermes user plugin directory, installed by npm

**Status:** Accepted (2026-11-20)

## Context

The routing backend, the controller and the skill are Python and Markdown
that run inside, or alongside, the Hermes harness. Before this decision they
were installed by hand into three places: the routing backend into the
Hermes source tree (wiped on every Hermes update), the controller into
`~/.hermes/scripts/`, and the skill into a category folder under
`~/.hermes/skills/`. The three copies drifted, and each side found the
others by searching a hardcoded list of paths.

## Decision

The package is published to npm. Its installer copies one directory into
the Hermes user plugin directory (`$HERMES_HOME/plugins/tiiny-router/`).
That directory holds the routing backend, the controller and the skill. The
routing backend registers the skill itself through Hermes's plugin skill
API, so nothing is written under `~/.hermes/skills/`. Every lookup between
the three is relative to that one directory.

## Alternatives considered

- **pip package.** Fits the runtime language, but Hermes runs in its own
  Python environment and the controller runs on the system `python3`;
  installing into the right interpreter is its own problem. npm gives a
  zero-dependency `npx` installer that runs anywhere Node does.
- **`hermes plugins install <git url>`.** Native, but it takes only git
  URLs, gives us no hook to run `hermes config set`, and offers no
  `doctor`.
- **Separate skill copy under `~/.hermes/skills/`.** Editable by agents in
  place, but that is exactly how the copies drifted before.

## Consequences

- npm delivers Python. Node is an install-time dependency only.
- The installed copy is a snapshot: upgrading the package means running
  `install` again.
- The skill is read-only and namespaced (`tiiny-router:tiiny-model-routing`)
  and disappears when the routing backend is disabled.
- `uninstall` removes one directory.
