# 11: `route-check` and `ctl` passthrough

**What to build:** A user runs the controller and the route checker
without knowing the install path. `hermesrouter route-check ...`
and `hermesrouter ctl ...` run the installed route checker and
controller with the system `python3`, passing arguments through and
returning the script's exit code. If the plugin is not installed, they
exit non-zero.

**Blocked by:** 05

**Touches:** `src/` (route-check, ctl subcommands), `test/`

**Status:** done

- [x] Arguments given after `ctl` reach the installed controller
      unchanged
- [x] Arguments given after `route-check` reach the installed route
      checker unchanged
- [x] The command's exit code equals the script's exit code, for both
      zero and non-zero
- [x] Without an install, both subcommands exit non-zero
