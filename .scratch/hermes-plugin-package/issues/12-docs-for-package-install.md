# 12: Docs for the package install

**What to build:** The docs describe the package as the source and the
installer as the way to deploy it. A new short `README.md` covers
install, the config step, `doctor`, upgrade (run `install` again) and
uninstall. `SKILL.md` and its references are rewritten wherever they
describe the vault, the sync script, symlinked copies,
`~/.hermes/scripts/`, or the Hermes-source-tree install path; controller
paths are written relative to the installed directory or as the
package's `ctl`/`route-check` commands. `single-source-deployment.md` is
deleted. Mesh, two-box and image-agency references stay only where
routing works with them on its own. The moved docs in `docs/` have links
to deleted folders removed or rewritten. `AGENTS.md` install steps
match the new install. Follow the user's doc rules: no em dashes, no
arrow characters. No tests (docs are not tested).

**Blocked by:** 03, 04, 08, 09, 10, 11

**Touches:** `README.md`, `AGENTS.md`, `SKILL.md`, `references/*.md`,
`references/single-source-deployment.md` (delete), `docs/README.md`,
`docs/PATTERN.md`, `docs/IMPLEMENTATION.md`

**Status:** done

- [x] No doc or skill file references `~/.hermes/scripts/`, the Hermes
      source tree install path, the vault, or the sync script
- [x] No doc links to a path that does not exist in the repo
- [x] Every command shown in `README.md` exists in the package's CLI
