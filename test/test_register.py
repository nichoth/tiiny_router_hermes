"""What the routing backend registers when Hermes loads the plugin.

Calls ``register(ctx)`` on a copy of ``tiiny-router/`` placed at an
arbitrary temporary path, with a fake ``ctx`` that records each
registration. The backend runs in a subprocess so its module state and
the stubbed Hermes import do not leak between tests.

Run with: ``python3 -B test/test_register.py``
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


class Register(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        tmp = Path(cls._tmp.name)
        home = tmp / "home"
        home.mkdir()
        cls.plugin = tmp / "some" / "other" / "place" / "tiiny-router"
        shutil.copytree(
            SOURCE,
            cls.plugin,
            ignore=shutil.ignore_patterns("__pycache__"),
        )
        probe = tmp / "probe.py"
        probe.write_text(_REGISTER_PROBE)
        env = {
            **os.environ,
            "PYTHONDONTWRITEBYTECODE": "1",
            "HOME": str(home),
            "HERMES_HOME": str(home / ".hermes"),
        }
        result = subprocess.run(
            [sys.executable, "-B", str(probe), str(cls.plugin)],
            cwd=home,
            env=env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise AssertionError(result.stderr)
        cls.calls = json.loads(result.stdout)

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def calls_to(self, method: str) -> list:
        return [c for c in self.calls if c["method"] == method]

    def test_registers_one_delegation_provider(self) -> None:
        providers = self.calls_to("register_delegation_provider")
        self.assertEqual(len(providers), 1)

    def test_registers_the_skill_by_name(self) -> None:
        skills = self.calls_to("register_skill")
        self.assertEqual(
            [s["name"] for s in skills], ["tiiny-model-routing"]
        )

    def test_skill_path_is_inside_the_copied_plugin(self) -> None:
        skills = self.calls_to("register_skill")
        self.assertEqual(len(skills), 1)
        path = Path(skills[0]["path"]).resolve()
        self.assertEqual(path.name, "SKILL.md")
        self.assertTrue(path.is_file())
        self.assertTrue(path.is_relative_to(self.plugin.resolve()))


# Loads the backend from the copy with a stub for the one Hermes module it
# imports, calls register() with a recording ctx, and prints the calls as
# JSON. Accepts the skill name and path either positionally or by keyword.
_REGISTER_PROBE = '''
import importlib.util
import json
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

calls = []


class Ctx:
    def register_delegation_provider(self, provider):
        calls.append({
            "method": "register_delegation_provider",
            "type": type(provider).__name__,
        })

    def register_skill(self, name, path, *args, **kwargs):
        calls.append({
            "method": "register_skill",
            "name": name,
            "path": str(path),
        })


module.register(Ctx())
print(json.dumps(calls))
'''


if __name__ == "__main__":
    unittest.main()
