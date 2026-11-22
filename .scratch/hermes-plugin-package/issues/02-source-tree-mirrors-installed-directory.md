# 02: Arrange the source as the installed directory, with relative lookups

**What to build:** The source tree is laid out exactly as it will be
installed at `$HERMES_HOME/plugins/tiiny-router/`: one directory holding
the routing backend (`__init__.py`, `plugin.yaml`, `tiers.py`,
`thinking.py`), the controller scripts, and the skill (`SKILL.md`,
`references/`, `templates/`). The installer will copy this one tree.
The routing backend, the controller and the route checker find each
other and the shared tier table relative to their own file location
only. Remove the multi-path search lists, including entries pointing at
deleted folders and at the Hermes source tree.

**Blocked by:** 01

**Touches:** the plugin source directory (e.g. `tiiny-router/`),
`__init__.py` (`_CTL_SPEC`), `scripts/route_check.py` (`_PLUGIN_DIRS`,
`_load`), `scripts/tiiny_ctl.py` (tier table `candidates` list,
`SKILL_ROOT`, `HERE`)

**Status:** done

- [x] A copy of the directory placed at an arbitrary path runs
      `route_check.py` successfully
- [x] A copy of the directory placed at an arbitrary path runs a
      read-only `tiiny_ctl.py` command that loads the tier table
      (e.g. `--help` or a plan dry run) without "could not find the
      tier table"
- [x] Importing the backend module from a copy at an arbitrary path
      loads the controller module (`ctl` is not `None`)
- [x] No lookup references `examples/`, `skill/plugin`, or
      `hermes-agent/plugins/delegation`
