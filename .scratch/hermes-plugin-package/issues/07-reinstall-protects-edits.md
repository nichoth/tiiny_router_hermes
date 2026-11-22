# 07: Re-install protection for edits and foreign directories

**What to build:** A user who edited an installed file does not lose the
edit to a re-install. Before overwriting, `install` compares installed
files against the manifest from the previous install; any file whose
hash differs is a local edit, and `install` stops with a non-zero exit
and lists those files. A target directory with no manifest is foreign
(e.g. a hand-installed copy) and also stops the install. `--force`
overwrites in both cases. Put the manifest comparison where `doctor`
(10) can reuse it.

**Blocked by:** 05

**Touches:** `src/` (install, manifest comparison), `test/`

**Status:** done

- [x] With an installed file edited, `install` exits non-zero and the
      edited file is unchanged
- [x] With an installed file edited, `install --force` exits zero and
      the file matches the package again
- [x] With a pre-existing target directory that has no manifest,
      `install` exits non-zero and leaves it untouched
- [x] With that foreign directory, `install --force` installs
