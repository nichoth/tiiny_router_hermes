"""The router and the controller resolve the plan file the same way.

The router reads the plan; the controller writes it. When HERMES_HOME is
a profile directory the two must agree on where "the base Hermes home"
is, or the router never sees the plan the controller wrote.

Each test copies tiiny-router/ to an arbitrary temporary path, sets
HERMES_HOME in a subprocess environment, imports the module, and reports
its plan path. The same environment is used for both sides so they face
the same HERMES_HOME.

Run with: ``python3 -B test/test_plan_path.py``
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / "tiiny-router"

_ROUTER_PROBE = '''
import importlib.util
import json
import os
import sys
import types
from pathlib import Path

stub = types.ModuleType("agent.delegation_provider")
stub.DelegationProvider = type("DelegationProvider", (), {})
stub.DelegationRouteError = type(
    "DelegationRouteError", (Exception,), {}
)
sys.modules["agent"] = types.ModuleType("agent")
sys.modules["agent.delegation_provider"] = stub

plugin = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location(
    "tiiny_router",
    plugin / "__init__.py",
    submodule_search_locations=[str(plugin)],
)
module = importlib.util.module_from_spec(spec)
sys.modules["tiiny_router"] = module
spec.loader.exec_module(module)

print(json.dumps({"plan_file": str(module.PLAN_FILE)}))
'''

_CTL_PROBE = '''
import importlib.util
import json
import os
import sys
from pathlib import Path

plugin = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location(
    "tiiny_ctl",
    plugin / "scripts" / "tiiny_ctl.py",
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

print(json.dumps({"plan_file": str(module.PLAN_FILE)}))
'''


class PlanPath(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.plugin = self.tmp / "plugin" / "tiiny-router"
        shutil.copytree(
            SOURCE,
            self.plugin,
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        self.router_probe = self.tmp / "router_probe.py"
        self.router_probe.write_text(_ROUTER_PROBE)
        self.ctl_probe = self.tmp / "ctl_probe.py"
        self.ctl_probe.write_text(_CTL_PROBE)

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def _run_probe(
        self, probe:Path, hermes_home:str,
        extra_env:dict[str, str] | None = None,
    ) -> dict:
        home = self.tmp / "fakehome"
        home.mkdir(exist_ok=True)
        env = {
            "PYTHONDONTWRITEBYTECODE": "1",
            "HOME": str(home),
            "HERMES_HOME": hermes_home,
            "PATH": os.environ.get("PATH", ""),
        }
        if extra_env:
            env.update(extra_env)
        result = subprocess.run(
            [
                sys.executable, "-B",
                str(probe), str(self.plugin),
            ],
            cwd=str(home),
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise AssertionError(
                f"probe failed:\n{result.stderr}"
            )
        return json.loads(result.stdout)

    def test_plain_hermes_home(self) -> None:
        """HERMES_HOME=<tmp>/home -- both resolve plan under it."""
        hh = str(self.tmp / "home")
        router = self._run_probe(self.router_probe, hh)
        ctl = self._run_probe(self.ctl_probe, hh)
        rp = Path(router["plan_file"])
        cp = Path(ctl["plan_file"])
        self.assertTrue(
            str(rp).startswith(hh),
            f"router plan {rp} not under {hh}",
        )
        self.assertEqual(rp, cp)

    def test_profile_hermes_home(self) -> None:
        """HERMES_HOME=.../profiles/work -- both resolve to parent."""
        base = self.tmp / "hermes"
        hh = str(base / "profiles" / "work")
        Path(hh).mkdir(parents=True, exist_ok=True)
        router = self._run_probe(self.router_probe, hh)
        ctl = self._run_probe(self.ctl_probe, hh)
        rp = Path(router["plan_file"])
        cp = Path(ctl["plan_file"])
        self.assertTrue(
            str(rp).startswith(str(base)),
            f"router plan {rp} not under {base}",
        )
        self.assertFalse(
            str(rp).startswith(hh),
            f"router plan {rp} should NOT be under profile {hh}",
        )
        self.assertEqual(rp, cp)

    def test_tiiny_plan_file_override(self) -> None:
        """TIINY_PLAN_FILE wins on both sides."""
        override = str(self.tmp / "custom-plan.json")
        hh = str(self.tmp / "home")
        extra = {"TIINY_PLAN_FILE": override}
        router = self._run_probe(
            self.router_probe, hh, extra_env=extra,
        )
        ctl = self._run_probe(
            self.ctl_probe, hh, extra_env=extra,
        )
        self.assertEqual(router["plan_file"], override)
        self.assertEqual(ctl["plan_file"], override)


if __name__ == "__main__":
    unittest.main()
