from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "audit-db-maintenance-timer.py"
SPEC = importlib.util.spec_from_file_location("audit_db_maintenance_timer", SCRIPT)
assert SPEC and SPEC.loader
audit = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(audit)


def status_with_timer(last_trigger: str = "") -> dict:
    return {
        "health": {
            "verified": True,
            "warnings": [],
        },
        "automation": {
            "timer": {
                "lastTrigger": last_trigger,
                "nextElapse": "Mon 2026-06-08 03:18:04 KST",
            },
            "service": {
                "result": "success",
                "execMainStatus": "0",
                "execMainStart": "Sun 2026-06-07 23:50:43 KST",
                "execMainExit": "Sun 2026-06-07 23:50:53 KST",
            },
        }
    }


class AuditDbMaintenanceTimerTest(unittest.TestCase):
    def test_waits_when_timer_has_not_triggered_yet(self) -> None:
        decision = audit.audit_decision(status_with_timer(), [], require_trigger=False)

        self.assertEqual(decision["status"], "waiting")
        self.assertEqual(decision["exitCode"], 0)
        self.assertEqual(decision["reason"], "timer-not-triggered")

    def test_require_trigger_fails_before_first_timer_trigger(self) -> None:
        decision = audit.audit_decision(status_with_timer(), [], require_trigger=True)

        self.assertEqual(decision["status"], "failed")
        self.assertEqual(decision["exitCode"], 2)
        self.assertEqual(decision["reason"], "timer-not-triggered")

    def test_reports_ok_after_timer_trigger(self) -> None:
        decision = audit.audit_decision(
            status_with_timer("Mon 2026-06-08 03:18:04 KST"),
            [],
            require_trigger=True,
        )

        self.assertEqual(decision["status"], "ok")
        self.assertEqual(decision["exitCode"], 0)
        self.assertEqual(decision["lastTrigger"], "Mon 2026-06-08 03:18:04 KST")
        self.assertEqual(decision["serviceResult"], "success")

    def test_status_failures_fail_audit(self) -> None:
        decision = audit.audit_decision(
            status_with_timer("Mon 2026-06-08 03:18:04 KST"),
            [{"code": "service_failed"}],
            require_trigger=True,
        )

        self.assertEqual(decision["status"], "failed")
        self.assertEqual(decision["exitCode"], 2)
        self.assertEqual(decision["failureCodes"], ["service_failed"])

    def test_maintenance_audit_filters_self_audit_failures(self) -> None:
        status = status_with_timer("Mon 2026-06-08 03:18:04 KST")
        status["automation"]["timer"].update({
            "available": True,
            "unitFileState": "enabled",
            "activeState": "active",
        })
        status["automation"]["service"].update({
            "available": True,
            "activeState": "inactive",
            "result": "success",
            "execMainStatus": "0",
        })
        status["automation"]["auditTimer"] = {
            "available": True,
            "unitFileState": "enabled",
            "activeState": "active",
            "nextElapse": "",
        }
        status["automation"]["auditService"] = {
            "available": True,
            "activeState": "failed",
            "result": "exit-code",
            "execMainStatus": "1",
        }

        failures = audit.maintenance_audit_failures(status, 0, 0)

        self.assertEqual(failures, [])

    def test_maintenance_audit_keeps_maintenance_failures(self) -> None:
        status = status_with_timer("Mon 2026-06-08 03:18:04 KST")
        status["automation"]["timer"].update({
            "available": True,
            "unitFileState": "disabled",
            "activeState": "inactive",
        })
        status["automation"]["service"].update({
            "available": True,
            "activeState": "inactive",
            "result": "success",
            "execMainStatus": "0",
        })

        failures = audit.maintenance_audit_failures(status, 0, 0)
        codes = [failure["code"] for failure in failures]

        self.assertIn("timer_not_enabled", codes)
        self.assertIn("timer_not_active", codes)


if __name__ == "__main__":
    unittest.main()
