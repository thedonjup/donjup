from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "show-db-status.py"
SPEC = importlib.util.spec_from_file_location("show_db_status", SCRIPT)
assert SPEC and SPEC.loader
show_db_status = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(show_db_status)


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


class ShowDbStatusTest(unittest.TestCase):
    def test_build_status_uses_latest_records(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            runs = data_dir / "runs"
            runs.mkdir()

            write_json(runs / "db-health-20260101-000000.json", {"runId": "old"})
            write_json(
                runs / "db-health-20260102-000000.json",
                {
                    "runId": "health-new",
                    "finishedAt": "2026-01-02T00:00:00+00:00",
                    "local": {
                        "sizeBytes": 1024,
                        "status": {"uniqueSaleRows": 10, "uniqueRentRows": 20},
                    },
                    "db": {
                        "verified": True,
                        "snapshot": {
                            "counts": {
                                "apt_complexes": 1,
                                "apt_transactions": 10,
                                "apt_rent_transactions": 18,
                                "page_views": 3,
                            }
                        },
                    },
                    "alignment": {
                        "sale": {"deltaLocalMinusDb": 0},
                        "rent": {"deltaLocalMinusDb": 2},
                    },
                    "guardrails": {"warnings": [{"code": "demo"}]},
                },
            )
            write_json(
                runs / "backup-20260102-000000.json",
                {
                    "runId": "backup-new",
                    "kind": "both",
                    "months": 1,
                    "dbVerified": True,
                    "uploadResult": {
                        "insertedComplexes": 1,
                        "insertedSaleRows": 2,
                        "insertedRentRows": 3,
                    },
                },
            )
            write_json(
                runs / "maintenance-20260102-000000.json",
                {
                    "runId": "maintenance-new",
                    "finishedAt": "2026-01-02T00:00:00+00:00",
                    "health": {"exit": 0},
                    "backup": {"decision": {"reason": "fresh"}},
                    "prune": {"dryRun": True, "candidateCount": 0, "deletedCount": 0},
                },
            )
            write_json(
                runs / "timer-audit-20260102-000000.json",
                {
                    "runId": "audit-new",
                    "finishedAt": "2026-01-02T01:00:00+00:00",
                    "requireTrigger": False,
                    "decision": {
                        "status": "waiting",
                        "reason": "timer-not-triggered",
                        "exitCode": 0,
                        "nextElapse": "Mon 2026-06-08 03:18:51 KST",
                    },
                },
            )

            status = show_db_status.build_status(data_dir, include_automation=False)
            lines = show_db_status.format_lines(status)

            self.assertEqual(status["health"]["runId"], "health-new")
            self.assertEqual(status["backup"]["runId"], "backup-new")
            self.assertEqual(status["maintenance"]["runId"], "maintenance-new")
            self.assertEqual(status["timerAudit"]["runId"], "audit-new")
            self.assertIn("warnings=1", lines[1])
            self.assertIn("db: complexes=1 sale=10 rent=18 pageViews=3", lines)
            self.assertIn("backup upload: complexes=1 sale=2 rent=3", lines)
            self.assertTrue(
                any(
                    line.startswith("maintenance: run=maintenance-new backup=fresh healthExit=0")
                    for line in lines
                )
            )
            self.assertTrue(
                any(
                    line.startswith(
                        "timer audit: run=audit-new status=waiting reason=timer-not-triggered"
                    )
                    for line in lines
                )
            )

    def test_build_status_prefers_required_timer_audit_record(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            runs = data_dir / "runs"
            runs.mkdir()

            write_json(
                runs / "timer-audit-20260101-000000.json",
                {
                    "runId": "audit-required",
                    "finishedAt": "2026-01-01T00:00:00+00:00",
                    "requireTrigger": True,
                    "decision": {"status": "ok", "reason": "timer-triggered"},
                },
            )
            write_json(
                runs / "timer-audit-20260102-000000.json",
                {
                    "runId": "audit-manual",
                    "finishedAt": "2026-01-02T00:00:00+00:00",
                    "requireTrigger": False,
                    "decision": {"status": "waiting", "reason": "timer-not-triggered"},
                },
            )

            status = show_db_status.build_status(data_dir, include_automation=False)
            lines = show_db_status.format_lines(status)

            self.assertEqual(status["timerAudit"]["runId"], "audit-required")
            self.assertTrue(
                any(
                    line.startswith("timer audit: run=audit-required status=ok reason=timer-triggered")
                    for line in lines
                )
            )

    def test_missing_records_are_reported_as_none(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            (data_dir / "runs").mkdir()

            lines = show_db_status.format_lines(
                show_db_status.build_status(data_dir, include_automation=False)
            )

            self.assertIn("health: none", lines)
            self.assertIn("backup: none", lines)
            self.assertIn("maintenance: none", lines)
            self.assertIn("timer audit: none", lines)

    def test_format_lines_includes_automation_status(self) -> None:
        lines = show_db_status.format_lines(
            {
                "runsDir": "/tmp/runs",
                "health": None,
                "backup": None,
                "maintenance": None,
                "automation": {
                    "timer": {
                        "available": True,
                        "unitFileState": "enabled",
                        "activeState": "active",
                        "nextElapse": "Mon 2026-06-08 03:18:04 KST",
                        "lastTrigger": "",
                    },
                    "service": {
                        "available": True,
                        "activeState": "inactive",
                        "result": "success",
                        "execMainStatus": "0",
                        "execMainStart": "Sun 2026-06-07 23:50:43 KST",
                        "execMainExit": "Sun 2026-06-07 23:50:53 KST",
                    },
                    "auditTimer": {
                        "available": True,
                        "unitFileState": "enabled",
                        "activeState": "active",
                        "nextElapse": "Mon 2026-06-08 03:35:04 KST",
                        "lastTrigger": "Sun 2026-06-07 03:39:43 KST",
                    },
                    "auditService": {
                        "available": True,
                        "activeState": "inactive",
                        "result": "success",
                        "execMainStatus": "0",
                        "execMainStart": "Sun 2026-06-07 03:39:43 KST",
                        "execMainExit": "Sun 2026-06-07 03:39:45 KST",
                    },
                },
            }
        )

        self.assertIn(
            "timer: enabled=enabled active=active next=Mon 2026-06-08 03:18:04 KST "
            "lastTrigger=n/a",
            lines,
        )
        self.assertIn(
            "service: active=inactive result=success exit=0 "
            "started=Sun 2026-06-07 23:50:43 KST "
            "finished=Sun 2026-06-07 23:50:53 KST",
            lines,
        )
        self.assertIn(
            "audit timer: enabled=enabled active=active next=Mon 2026-06-08 03:35:04 KST "
            "lastTrigger=Sun 2026-06-07 03:39:43 KST",
            lines,
        )
        self.assertIn(
            "audit service: active=inactive result=success exit=0 "
            "started=Sun 2026-06-07 03:39:43 KST "
            "finished=Sun 2026-06-07 03:39:45 KST",
            lines,
        )

    def test_format_optional_handles_empty_values(self) -> None:
        self.assertEqual(show_db_status.format_optional(""), "n/a")
        self.assertEqual(show_db_status.format_optional(None), "n/a")
        self.assertEqual(show_db_status.format_optional("value"), "value")

    def test_parse_properties_ignores_lines_without_separator(self) -> None:
        self.assertEqual(
            show_db_status.parse_properties("ActiveState=active\nignored\nResult=success\n"),
            {"ActiveState": "active", "Result": "success"},
        )

    def test_failure_payload_includes_recovery_hint(self) -> None:
        failure = show_db_status.failure_payload(
            "timer_not_active",
            "Maintenance timer is not active.",
            state="inactive",
        )

        self.assertEqual(failure["state"], "inactive")
        self.assertIn("pnpm db:timer:enable", failure["hint"])

    def test_status_failures_only_apply_when_enabled(self) -> None:
        status = {
            "health": {
                "verified": True,
                "runId": "health",
                "warnings": [{"code": "local_data_size_high"}],
            }
        }

        self.assertEqual(show_db_status.status_failures(status, fail_on_warning=False), [])
        failures = show_db_status.status_failures(status, fail_on_warning=True)

        self.assertEqual(failures[0]["code"], "health_warnings")
        self.assertEqual(failures[0]["count"], 1)
        self.assertIn("latest db-health JSON", failures[0]["hint"])

    def test_status_failures_include_missing_or_unverified_health(self) -> None:
        self.assertEqual(
            show_db_status.status_failures({}, fail_on_warning=True)[0]["code"],
            "health_missing",
        )
        self.assertEqual(
            show_db_status.status_failures(
                {"health": {"verified": False, "runId": "health", "warnings": []}},
                fail_on_warning=True,
            )[0]["code"],
            "db_not_verified",
        )

    def test_status_failures_report_stale_records(self) -> None:
        status = {
            "health": {
                "verified": True,
                "runId": "health",
                "warnings": [],
                "finishedAt": "2026-01-01T00:00:00+00:00",
            },
            "maintenance": {
                "runId": "maintenance",
                "finishedAt": "2026-01-01T00:00:00+00:00",
            },
        }

        failures = show_db_status.status_failures(
            status,
            fail_on_warning=False,
            max_health_age_hours=30,
            max_maintenance_age_hours=30,
            now=datetime(2026, 1, 2, 7, tzinfo=timezone.utc),
        )
        codes = [failure["code"] for failure in failures]

        self.assertIn("health_stale", codes)
        self.assertIn("maintenance_stale", codes)
        self.assertIn("pnpm db:health", failures[0]["hint"])

    def test_status_failures_report_unknown_record_time(self) -> None:
        failures = show_db_status.status_failures(
            {
                "health": {"runId": "health", "finishedAt": "bad-date"},
                "maintenance": {"runId": "maintenance", "finishedAt": "bad-date"},
            },
            fail_on_warning=False,
            max_health_age_hours=30,
            max_maintenance_age_hours=30,
            now=datetime(2026, 1, 2, tzinfo=timezone.utc),
        )
        codes = [failure["code"] for failure in failures]

        self.assertIn("health_time_unknown", codes)
        self.assertIn("maintenance_time_unknown", codes)

    def test_status_failures_report_timer_audit_missing_or_bad(self) -> None:
        missing = show_db_status.status_failures(
            {},
            fail_on_warning=False,
            max_timer_audit_age_hours=30,
        )
        self.assertEqual(missing[0]["code"], "timer_audit_missing")

        failures = show_db_status.status_failures(
            {
                "timerAudit": {
                    "runId": "audit",
                    "finishedAt": "bad-date",
                    "requireTrigger": False,
                    "decision": {"status": "waiting"},
                    "failureCodes": ["timer_not_triggered"],
                }
            },
            fail_on_warning=False,
            max_timer_audit_age_hours=30,
            now=datetime(2026, 1, 2, tzinfo=timezone.utc),
        )
        codes = [failure["code"] for failure in failures]

        self.assertIn("timer_audit_not_required", codes)
        self.assertIn("timer_audit_not_ok", codes)
        self.assertIn("timer_audit_time_unknown", codes)
        self.assertIn("timer_not_triggered", failures[1]["failureCodes"])

    def test_status_failures_report_stale_timer_audit(self) -> None:
        failures = show_db_status.status_failures(
            {
                "timerAudit": {
                    "runId": "audit",
                    "finishedAt": "2026-01-01T00:00:00+00:00",
                    "requireTrigger": True,
                    "decision": {"status": "ok"},
                    "failureCodes": [],
                }
            },
            fail_on_warning=False,
            max_timer_audit_age_hours=30,
            now=datetime(2026, 1, 2, 7, tzinfo=timezone.utc),
        )

        self.assertEqual([failure["code"] for failure in failures], ["timer_audit_stale"])

    def test_status_failures_pass_when_timer_audit_is_fresh_and_ok(self) -> None:
        failures = show_db_status.status_failures(
            {
                "timerAudit": {
                    "runId": "audit",
                    "finishedAt": "2026-01-02T00:00:00+00:00",
                    "requireTrigger": True,
                    "decision": {"status": "ok"},
                    "failureCodes": [],
                }
            },
            fail_on_warning=False,
            max_timer_audit_age_hours=30,
            now=datetime(2026, 1, 2, 1, tzinfo=timezone.utc),
        )

        self.assertEqual(failures, [])

    def test_missing_health_is_not_reported_twice(self) -> None:
        failures = show_db_status.status_failures(
            {},
            fail_on_warning=True,
            max_health_age_hours=30,
        )

        self.assertEqual([failure["code"] for failure in failures], ["health_missing"])

    def test_automation_failures_pass_when_timer_and_service_are_healthy(self) -> None:
        status = {
            "automation": {
                "timer": {
                    "available": True,
                    "unitFileState": "enabled",
                    "activeState": "active",
                    "nextElapse": "Mon 2026-06-08 03:18:04 KST",
                },
                "service": {
                    "available": True,
                    "activeState": "inactive",
                    "result": "success",
                    "execMainStatus": "0",
                },
                "auditTimer": {
                    "available": True,
                    "unitFileState": "enabled",
                    "activeState": "active",
                    "nextElapse": "Mon 2026-06-08 03:35:04 KST",
                },
                "auditService": {
                    "available": True,
                    "activeState": "inactive",
                    "result": "success",
                    "execMainStatus": "0",
                },
            }
        }

        self.assertEqual(show_db_status.automation_failures(status), [])
        self.assertEqual(
            show_db_status.status_failures(
                status,
                fail_on_warning=False,
                fail_on_automation=True,
            ),
            [],
        )

    def test_automation_failures_report_timer_problems(self) -> None:
        status = {
            "automation": {
                "timer": {
                    "available": True,
                    "unitFileState": "disabled",
                    "activeState": "inactive",
                    "nextElapse": "",
                },
                "service": {
                    "available": True,
                    "activeState": "inactive",
                    "result": "success",
                    "execMainStatus": "0",
                },
            }
        }

        codes = [failure["code"] for failure in show_db_status.automation_failures(status)]

        self.assertIn("timer_not_enabled", codes)
        self.assertIn("timer_not_active", codes)
        self.assertIn("timer_not_scheduled", codes)
        self.assertIn("pnpm db:timer:enable", show_db_status.automation_failures(status)[0]["hint"])

    def test_automation_failures_report_service_problems(self) -> None:
        status = {
            "automation": {
                "timer": {
                    "available": True,
                    "unitFileState": "enabled",
                    "activeState": "active",
                    "nextElapse": "Mon 2026-06-08 03:18:04 KST",
                },
                "service": {
                    "available": True,
                    "activeState": "failed",
                    "result": "exit-code",
                    "execMainStatus": "1",
                },
            }
        }

        codes = [failure["code"] for failure in show_db_status.automation_failures(status)]

        self.assertIn("service_active_failed", codes)
        self.assertIn("service_failed", codes)
        self.assertIn("service_exit_nonzero", codes)
        self.assertIn("journalctl", show_db_status.automation_failures(status)[0]["hint"])

    def test_automation_failures_report_audit_problems(self) -> None:
        status = {
            "automation": {
                "timer": {
                    "available": True,
                    "unitFileState": "enabled",
                    "activeState": "active",
                    "nextElapse": "Mon 2026-06-08 03:18:04 KST",
                },
                "service": {
                    "available": True,
                    "activeState": "inactive",
                    "result": "success",
                    "execMainStatus": "0",
                },
                "auditTimer": {
                    "available": True,
                    "unitFileState": "disabled",
                    "activeState": "inactive",
                    "nextElapse": "",
                },
                "auditService": {
                    "available": True,
                    "activeState": "failed",
                    "result": "exit-code",
                    "execMainStatus": "1",
                },
            }
        }

        failures = show_db_status.automation_failures(status)
        codes = [failure["code"] for failure in failures]

        self.assertIn("audit_timer_not_enabled", codes)
        self.assertIn("audit_timer_not_active", codes)
        self.assertIn("audit_timer_not_scheduled", codes)
        self.assertIn("audit_service_active_failed", codes)
        self.assertIn("audit_service_failed", codes)
        self.assertIn("audit_service_exit_nonzero", codes)
        self.assertTrue(any("db:timer:enable" in failure["hint"] for failure in failures))

    def test_automation_failure_is_reported_when_status_was_not_collected(self) -> None:
        self.assertEqual(
            show_db_status.status_failures(
                {},
                fail_on_warning=False,
                fail_on_automation=True,
            )[0]["code"],
            "automation_missing",
        )


if __name__ == "__main__":
    unittest.main()
