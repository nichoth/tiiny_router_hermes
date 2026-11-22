# 06: Version stamping

**What to build:** `package.json` is the only source of the version. An
npm `version` script stamps it into `plugin.yaml` and the `SKILL.md`
frontmatter. The install manifest records the version, so an installed
directory carries the package version. `package.json` `contributors`
keeps the original attribution ("Gary Garcia (garciacionet-alt), Hermes
Agent").

**Blocked by:** 05

**Touches:** `package.json` (`version` script, `contributors`), a stamp
script, `plugin.yaml`, `SKILL.md`, install manifest code in `src/`

**Status:** done

- [x] After `install`, the installed `plugin.yaml` version and the
      manifest version equal the `package.json` version
- [x] After `install`, the installed `SKILL.md` frontmatter version
      equals the `package.json` version
- [x] Running the stamp script after changing the `package.json`
      version updates both `plugin.yaml` and `SKILL.md`
