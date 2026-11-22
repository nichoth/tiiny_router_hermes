# 01: Prune the repo and move the package to the root

**What to build:** The repo holds only the package. Everything outside
`tiiny-model-routing/` is deleted in an ordinary commit (no history
rewrite), except the survivors listed in the spec: `LICENSE`,
`AGENTS.md`, `docs/agents/`, `docs/adr/`, `.agents/`, `.claude/`,
`.gitignore`, `.gitattributes`, `CONTEXT.md`, `.scratch/`, and the
`@substrate-system/redeye` devDependency in `package.json`. The contents
of `tiiny-model-routing/` move to the repo root. The duplicate copies are
removed: `examples/tiiny-router/` is identical to `skill/plugin/`, and the
top-level `scripts/` is identical to `skill/scripts/` (which also has
`tiiny_two_box_matrix.py`); keep the `skill/` copies. The long-form
`README.md`, `PATTERN.md` and `IMPLEMENTATION.md` move to `docs/`. This
is a mechanical move; path lookups are fixed in 02.

**Blocked by:** None (can start immediately)

**Touches:** `agent-memory-commons/`, `bot-identity/`, `muse-patterns/`,
`OpenHuman/`, `private-agent-network/`, `remote-agent-access/`, `Tiiny/`,
`tiiny-image-agency/`, `tiiny-mesh/`, `tiiny-model-catalogue/`,
`tiiny-two-boxes/`, top-level `README.md`, `tiiny-model-routing/**`,
`docs/README.md`, `docs/PATTERN.md`, `docs/IMPLEMENTATION.md`

**Status:** done

- [x] Only the survivor paths and the moved package contents remain in
      the tree
- [x] There is exactly one copy of the backend modules (`__init__.py`,
      `plugin.yaml`, `tiers.py`, `thinking.py`) and of each controller
      script
- [x] `python3 skill/scripts/route_check.py` still runs from the moved
      tree as it did before the move
