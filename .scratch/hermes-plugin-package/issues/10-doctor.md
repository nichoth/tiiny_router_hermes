# 10: `doctor`

**What to build:** A user can tell why delegation is not routing.
`hermesrouter doctor` prints a pass/fail line per check and exits
non-zero on any failure: the directory exists and is complete; the
installed version matches the package; no file differs from the
manifest; `hermes plugins validate` passes; `delegation.backend` selects
the routing backend (read via the `hermes` CLI, not by parsing
`config.yaml`); `python3` is present; the device answers. An unreachable
device is a warning, not a failure. It may mention a stale copy in the
Hermes source tree but does not remove it.

**Blocked by:** 06, 07

**Touches:** `src/` (doctor, reuses manifest comparison from 07 and
version from 06), `test/` (fake `hermes` reports config values)

**Status:** done

- [x] On a healthy install with the backend selected, `doctor` exits
      zero even when the device cannot be reached
- [x] With an installed file deleted, `doctor` exits non-zero
- [x] With the manifest version differing from the package, `doctor`
      exits non-zero
- [x] With an installed file edited, `doctor` exits non-zero
- [x] With `delegation.backend` not selecting the routing backend,
      `doctor` exits non-zero
- [x] When the fake `hermes plugins validate` fails, `doctor` exits
      non-zero
