# 05: Messages name the real command

**What to build:** error and usage text tell the user to run
`hermes-tiiny-router`, but the command is `hermesrouter`. The usage text,
the passthrough "not installed" error and the top-level error prefix use
`npx --package hermes-tiiny-router hermesrouter <command>` where they
suggest a command, and `hermesrouter` as the program name. The uninstall
message that says a directory "was not installed by hermes-tiiny-router"
names the package and stays as it is.

**Blocked by:** None (can start immediately)
**Touches:** `src/cli.ts` (`USAGE`, top-level error prefix),
`src/passthrough.ts`

**Status:** done

- [x] No user-facing message suggests running `hermes-tiiny-router` as a
      command (checked by review and a grep of `src/`; no text test is
      added)
- [x] `npm test` passes
