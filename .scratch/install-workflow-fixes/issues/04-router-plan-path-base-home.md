# 04: Router reads the plan from the base Hermes home

**What to build:** the router reads the plan from a fixed
`~/.hermes/tiiny-plan.json`, while the controller writes it to the base
Hermes home, so with a custom non-profile `HERMES_HOME` the two use
different files. The router's default plan path follows the controller's
rule: the parent of `HERMES_HOME` when it is `.../profiles/<name>`, else
`HERMES_HOME`, defaulting to `~/.hermes`. `TIINY_PLAN_FILE` still
overrides it on both sides. The rule is duplicated in the router with a
comment pointing at the controller's version (a shared module is out of
scope). Docstrings and `references/backend.md` that say
`~/.hermes/tiiny-plan.json` say the plan lives in the base Hermes home.

**Blocked by:** None (can start immediately)
**Touches:** `tiiny-router/__init__.py` (`PLAN_FILE`, `planned_models`
docstring, module docstring), `tiiny-router/scripts/tiiny_ctl.py`
(shared-home helper, docstring), `tiiny-router/references/backend.md`,
a new `test/test_plan_path.py`, `package.json` (`test` script)

**Status:** done

- [x] With `TIINY_PLAN_FILE` unset and `HERMES_HOME=<tmp>/home`, the
      router's plan path is under `<tmp>/home` and equals the
      controller's default plan path
- [x] With `TIINY_PLAN_FILE` unset and
      `HERMES_HOME=<tmp>/hermes/profiles/work`, the router's plan path is
      under `<tmp>/hermes` and equals the controller's
- [x] With `TIINY_PLAN_FILE` set, both sides use that path
- [x] The test imports both from a copied tree (stub
      `agent.delegation_provider` in `sys.modules`, as in
      `test/test_register.py`) and runs under `npm test`
- [x] Each new test is checked to go red by briefly breaking the code
      (restore from a copy, not `git checkout`)
