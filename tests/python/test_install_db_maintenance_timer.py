from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "install-db-maintenance-timer.py"
SPEC = importlib.util.spec_from_file_location("install_db_maintenance_timer", SCRIPT)
assert SPEC and SPEC.loader
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


class InstallDbMaintenanceTimerTest(unittest.TestCase):
    def test_systemd_path_filters_transient_or_invalid_entries(self) -> None:
        value = ":".join(
            [
                "/tmp/keep",
                "relative",
                "/home/user/.codex/tmp/tool",
                "/home/user/.vscode/extensions/openai/bin",
                "/tmp/with\nnewline",
                "/usr/bin",
            ]
        )

        result = installer.systemd_path(value, "/home/user/.local/bin/pnpm").split(":")

        self.assertIn("/home/user/.local/bin", result)
        self.assertIn("/tmp/keep", result)
        self.assertIn("/usr/bin", result)
        self.assertNotIn("relative", result)
        self.assertFalse(any(".codex" in item for item in result))
        self.assertFalse(any(".vscode/extensions" in item for item in result))
        self.assertFalse(any("\n" in item for item in result))

    def test_render_template_replaces_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            template = Path(temp_dir) / "unit.template"
            template.write_text("WorkingDirectory={{WORKDIR}}\nExecStart={{PNPM}}\n", encoding="utf-8")

            rendered = installer.render_template(
                template,
                {"WORKDIR": "/repo", "PNPM": "/bin/pnpm"},
            )

            self.assertEqual(rendered, "WorkingDirectory=/repo\nExecStart=/bin/pnpm\n")

    def test_unit_templates_include_maintenance_and_audit_units(self) -> None:
        units = installer.unit_templates(
            {
                "WORKDIR": "/repo",
                "PNPM": "/bin/pnpm",
                "PATH": "/bin",
                "DOC_PATH": "/repo/docs/database-free-tier-plan.md",
            }
        )

        self.assertEqual(set(units), set(installer.UNIT_NAMES))
        self.assertIn("ExecStart=/bin/pnpm --silent db:maintenance", units[installer.SERVICE_NAME])
        self.assertIn(
            "ExecStart=/bin/pnpm --silent db:timer:audit:required",
            units[installer.AUDIT_SERVICE_NAME],
        )
        self.assertIn("OnCalendar=*-*-* 03:35:00", units[installer.AUDIT_TIMER_NAME])


if __name__ == "__main__":
    unittest.main()
