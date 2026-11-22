"""The plugin source tree works from wherever it is copied.

The installer copies ``tiiny-router/`` as one tree into
``$HERMES_HOME/plugins/tiiny-router/``. These tests copy it to an arbitrary
temporary path and exercise it there, so any lookup that depends on the
repo layout (or on some other fixed path) fails here.

Run with: ``python3 -B test/test_installed_tree.py``
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).resolve().parent.parent / "tiiny-router"

_OFFLINE_ENV = {"PYTHONDONTWRITEBYTECODE": "1"}


class CopiedTree(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        tmp = Path(self._tmp.name)
        self.home = tmp / "home"
        self.home.mkdir()
        self.plugin = tmp / "somewhere" / "else" / "tiiny-router"
        shutil.copytree(
            SOURCE,
            self.plugin,
            ignore=shutil.ignore_patterns("__pycache__"),
        )

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def run_script(self, name: str, *args: str):
        env = {
            **os.environ,
            **_OFFLINE_ENV,
            "HOME": str(self.home),
            "HERMES_HOME": str(self.home / ".hermes"),
        }
        return subprocess.run(
            [sys.executable, "-B", str(self.plugin / "scripts" / name), *args],
            cwd=self.home,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )

    def test_route_check_runs(self) -> None:
        result = self.run_script("route_check.py", "--all")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_route_check_routes_a_goal(self) -> None:
        result = self.run_script(
            "route_check.py", "write a python function that parses dates"
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def code_tier_rows(self) -> list[tuple[str, int, int]]:
        """The ``code`` tier's (model, NPU %, context) rows from --all."""
        result = self.run_script("route_check.py", "--all")
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = []
        for line in result.stdout.splitlines():
            cells = line.lstrip("* ").split()
            if len(cells) == 4 and cells[0] == "code":
                rows.append((cells[1], int(cells[2].rstrip("%")),
                             int(cells[3])))
        return rows

    def test_code_tier_offers_ornith_1_5_turbo(self) -> None:
        rows = self.code_tier_rows()
        self.assertEqual(rows[0][0], "Qwen/Qwen3.6-35B-A3B")
        self.assertEqual(
            rows[1], ("ornith-ai/Ornith-1.5-35B-A3B-Turbo", 54, 262144)
        )

    def test_route_check_never_reports_ornith_1_0(self) -> None:
        models = [row[0] for row in self.code_tier_rows()]
        self.assertNotIn("deepreinforce-ai/Ornith-1.0-35B", models)
        result = self.run_script(
            "route_check.py", "--tier", "code", "--alternatives",
            "fix the failing build",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("Ornith-1.0-35B", result.stdout)

    def test_controller_loads_tier_table(self) -> None:
        # The controller loads the tier table at import, before argparse
        # runs, so --help exits non-zero if the table cannot be found.
        result = self.run_script("tiiny_ctl.py", "--help")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_backend_loads_controller(self) -> None:
        # Import the backend as a package from the copy, with a stub for
        # the one Hermes module it imports, and report whether it found
        # the controller.
        probe = self.home / "probe.py"
        probe.write_text(_IMPORT_PROBE)
        env = {
            **os.environ,
            **_OFFLINE_ENV,
            "HOME": str(self.home),
            "HERMES_HOME": str(self.home / ".hermes"),
        }
        result = subprocess.run(
            [sys.executable, "-B", str(probe), str(self.plugin)],
            cwd=self.home,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), "controller loaded")


_IMPORT_PROBE = '''
import importlib.util
import sys
import types
from pathlib import Path

stub = types.ModuleType("agent.delegation_provider")
stub.DelegationProvider = type("DelegationProvider", (), {})
stub.DelegationRouteError = type("DelegationRouteError", (Exception,), {})
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
print("controller loaded" if module.ctl is not None else "no controller")
'''


if __name__ == "__main__":
    unittest.main()
