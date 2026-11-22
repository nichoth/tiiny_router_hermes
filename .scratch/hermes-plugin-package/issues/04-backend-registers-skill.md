# 04: The routing backend registers the skill

**What to build:** When Hermes loads the plugin, the manager agent gets
the skill with no separate copy under `~/.hermes/skills/`. The backend's
`register(ctx)` keeps registering the delegation provider and also calls
`ctx.register_skill` under the name `tiiny-model-routing`, so it
resolves as `tiiny-router:tiiny-model-routing`. Adds the seam 2 test: a
Python test that calls `register(ctx)` with a fake `ctx` and is runnable
with the system `python3` as a standalone script (05 wires it into
`npm test`).

**Blocked by:** 02

**Touches:** backend `__init__.py` (`register`), `SKILL.md`, a new
Python test under `test/`

**Status:** done

- [x] `register(ctx)` registers exactly one delegation provider
- [x] `register(ctx)` registers a skill named `tiiny-model-routing`
- [x] The registered skill path resolves to a `SKILL.md` inside the
      plugin directory, including when the directory is copied to an
      arbitrary path
