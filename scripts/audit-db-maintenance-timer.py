#!/usr/bin/env python3
"""Audit the DonJup DB maintenance timer and write a compact local record."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"
STATUS_SCRIPT = ROOT / "scripts" / "show-db-status.py"
DEFAULT_MAX_AGE_HOURS = 30.0
SELF_AUDIT_FAILURE_PREFIX = "audit_"

SPEC = importlib.util.spec_from_file_location("show_db_status", STATUS_SCRIPT)
if not SPEC or not SPEC.loader:
    raise RuntimeError(f"Cannot load {STATUS_SCRIPT}")
show_db_status = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(show_db_status)


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def local_data_dir() -> Path:
    return Path(show_db_status.local_data_dir())


def runs_dir() -> Path:
    path = local_data_dir() / "runs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def audit_decision(status: dict[str, Any], failures: list[dict[str, Any]], require_trigger: bool) -> dict[str, Any]:
    automation = status.get("automation") if isinstance(status.get("automation"), dict) else {}
    timer = automation.get("timer", {}) if isinstance(automation, dict) else {}
    service = automation.get("service", {}) if isinstance(automation, dict) else {}
    last_trigger = timer.get("lastTrigger") if isinstance(timer, dict) else None
    next_elapse = timer.get("nextElapse") if isinstance(timer, dict) else None

    if failures:
        return {
            "status": "failed",
            "exitCode": 2,
            "reason": "status-failures",
            "failureCodes": [failure.get("code") for failure in failures],
        }

    if not last_trigger:
        return {
            "status": "failed" if require_trigger else "waiting",
            "exitCode": 2 if require_trigger else 0,
            "reason": "timer-not-triggered",
            "nextElapse": next_elapse,
        }

    return {
        "status": "ok",
        "exitCode": 0,
        "reason": "timer-triggered",
        "lastTrigger": last_trigger,
        "serviceResult": service.get("result") if isinstance(service, dict) else None,
        "serviceExit": service.get("execMainStatus") if isinstance(service, dict) else None,
        "serviceStarted": service.get("execMainStart") if isinstance(service, dict) else None,
        "serviceFinished": service.get("execMainExit") if isinstance(service, dict) else None,
    }


def maintenance_audit_failures(
    status: dict[str, Any],
    max_health_age_hours: float,
    max_maintenance_age_hours: float,
) -> list[dict[str, Any]]:
    failures = show_db_status.status_failures(
        status,
        fail_on_warning=True,
        fail_on_automation=True,
        max_health_age_hours=max_health_age_hours,
        max_maintenance_age_hours=max_maintenance_age_hours,
    )
    return [
        failure for failure in failures
        if not str(failure.get("code", "")).startswith(SELF_AUDIT_FAILURE_PREFIX)
    ]


def write_summary(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit DonJup DB maintenance timer status.")
    parser.add_argument(
        "--require-trigger",
        action="store_true",
        help="fail when the timer has not triggered yet",
    )
    parser.add_argument(
        "--max-health-age-hours",
        type=show_db_status.nonnegative_float,
        default=DEFAULT_MAX_AGE_HOURS,
        help="maximum accepted db-health record age",
    )
    parser.add_argument(
        "--max-maintenance-age-hours",
        type=show_db_status.nonnegative_float,
        default=DEFAULT_MAX_AGE_HOURS,
        help="maximum accepted maintenance record age",
    )
    args = parser.parse_args()

    run_id = timestamp()
    started_at = iso_now()
    status = show_db_status.build_status(local_data_dir(), include_automation=True)
    failures = maintenance_audit_failures(
        status,
        args.max_health_age_hours,
        args.max_maintenance_age_hours,
    )
    decision = audit_decision(status, failures, args.require_trigger)
    finished_at = iso_now()
    summary = {
        "runId": run_id,
        "startedAt": started_at,
        "finishedAt": finished_at,
        "requireTrigger": args.require_trigger,
        "decision": decision,
        "checks": {"failures": failures},
        "status": status,
    }
    summary_path = runs_dir() / f"timer-audit-{run_id}.json"
    write_summary(summary_path, summary)

    print(f"timer audit: {decision['status']} reason={decision['reason']}")
    if decision.get("nextElapse"):
        print(f"next: {decision['nextElapse']}")
    if decision.get("lastTrigger"):
        print(f"lastTrigger: {decision['lastTrigger']}")
    if failures:
        print("failures: " + ",".join(str(item.get("code")) for item in failures))
    print(f"summary: {summary_path}")
    return int(decision["exitCode"])


if __name__ == "__main__":
    sys.exit(main())
