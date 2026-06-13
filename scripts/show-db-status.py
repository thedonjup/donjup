#!/usr/bin/env python3
"""Show the latest DonJup DB maintenance status from local run records."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"
TIMER_NAME = "donjup-db-maintenance.timer"
SERVICE_NAME = "donjup-db-maintenance.service"
AUDIT_TIMER_NAME = "donjup-db-maintenance-audit.timer"
AUDIT_SERVICE_NAME = "donjup-db-maintenance-audit.service"
ENABLED_UNIT_STATES = {"enabled", "enabled-runtime"}
SUCCESS_SERVICE_RESULTS = {"", "success"}
TIMER_PROPERTIES = [
    "LoadState",
    "ActiveState",
    "UnitFileState",
    "NextElapseUSecRealtime",
    "LastTriggerUSec",
]
SERVICE_PROPERTIES = [
    "LoadState",
    "ActiveState",
    "Result",
    "ExecMainStatus",
    "ExecMainStartTimestamp",
    "ExecMainExitTimestamp",
]
FAILURE_HINTS = {
    "health_missing": "run pnpm db:health to create a fresh DB health record",
    "health_time_unknown": "run pnpm db:health to rewrite the health record with a timestamp",
    "health_stale": "run pnpm db:health, then check pnpm db:status:ops again",
    "maintenance_missing": "run pnpm db:maintenance:check to create a maintenance record",
    "maintenance_time_unknown": "run pnpm db:maintenance:check to rewrite the maintenance record with a timestamp",
    "maintenance_stale": "run pnpm db:maintenance:check, then inspect the timer if it stays stale",
    "timer_audit_missing": "run pnpm db:timer:audit:required to create a timer audit record",
    "timer_audit_time_unknown": "run pnpm db:timer:audit:required to rewrite the timer audit record with a timestamp",
    "timer_audit_stale": "run pnpm db:timer:audit:required, then inspect the audit timer if it stays stale",
    "timer_audit_not_required": "run pnpm db:timer:audit:required after the scheduled maintenance timer has triggered",
    "timer_audit_not_ok": "inspect the latest timer-audit JSON, then run pnpm db:timer:audit:required",
    "db_not_verified": "check .env.local DATABASE_URL, then run pnpm db:health",
    "health_warnings": "inspect the latest db-health JSON, then adjust limits or run pnpm db:backup",
    "automation_missing": "run without --no-automation or run pnpm db:timer:enable",
    "timer_unavailable": "run pnpm db:timer:enable to install and start the timer",
    "timer_not_enabled": "run pnpm db:timer:enable to enable the timer",
    "timer_not_active": "run pnpm db:timer:enable to start the timer",
    "timer_not_scheduled": "run systemctl --user daemon-reload, then pnpm db:timer:enable",
    "service_unavailable": "run pnpm db:timer:enable to reinstall the service unit",
    "service_active_failed": (
        "run journalctl --user -u donjup-db-maintenance.service -n 80 --no-pager, "
        "then systemctl --user reset-failed donjup-db-maintenance.service"
    ),
    "service_failed": "run journalctl --user -u donjup-db-maintenance.service -n 80 --no-pager",
    "service_exit_nonzero": "run pnpm db:maintenance:check, then inspect the latest maintenance log",
    "audit_timer_unavailable": "run pnpm db:timer:enable to install and start the audit timer",
    "audit_timer_not_enabled": "run pnpm db:timer:enable to enable the audit timer",
    "audit_timer_not_active": "run pnpm db:timer:enable to start the audit timer",
    "audit_timer_not_scheduled": "run systemctl --user daemon-reload, then pnpm db:timer:enable",
    "audit_service_unavailable": "run pnpm db:timer:enable to reinstall the audit service unit",
    "audit_service_active_failed": (
        "run journalctl --user -u donjup-db-maintenance-audit.service -n 80 --no-pager, "
        "then systemctl --user reset-failed donjup-db-maintenance-audit.service"
    ),
    "audit_service_failed": "run journalctl --user -u donjup-db-maintenance-audit.service -n 80 --no-pager",
    "audit_service_exit_nonzero": "run pnpm db:timer:audit:required, then inspect the latest timer-audit record",
}


def local_data_dir() -> Path:
    return Path(os.environ.get("DONJUP_LOCAL_DATA_DIR") or DEFAULT_DATA_DIR)


def read_json_file(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def latest_json(runs_dir: Path, prefix: str) -> tuple[Path, dict[str, Any]] | None:
    paths = sorted(runs_dir.glob(f"{prefix}-*.json"))
    for path in reversed(paths):
        payload = read_json_file(path)
        if payload is not None:
            return path, payload
    return None


def latest_timer_audit_json(runs_dir: Path) -> tuple[Path, dict[str, Any]] | None:
    latest_valid: tuple[Path, dict[str, Any]] | None = None
    for path in reversed(sorted(runs_dir.glob("timer-audit-*.json"))):
        payload = read_json_file(path)
        if payload is None:
            continue
        if latest_valid is None:
            latest_valid = (path, payload)
        if payload.get("requireTrigger") is True:
            return path, payload
    return latest_valid


def nested_get(payload: dict[str, Any] | None, keys: list[str], default: Any = None) -> Any:
    current: Any = payload
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
    return default if current is None else current


def format_mb(bytes_value: int | None) -> str:
    if not isinstance(bytes_value, int):
        return "n/a"
    return f"{bytes_value / 1024 / 1024:.1f}MB"


def format_hours(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.1f}h"


def format_optional(value: Any) -> str:
    return str(value) if value else "n/a"


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def record_age_hours(finished_at: str | None, now: datetime | None = None) -> float | None:
    parsed = parse_iso_datetime(finished_at)
    if parsed is None:
        return None
    checked_at = now or datetime.now(timezone.utc)
    return max(0.0, (checked_at - parsed).total_seconds() / 3600)


def nonnegative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("value must be 0 or greater")
    return parsed


def file_entry(path_payload: tuple[Path, dict[str, Any]] | None) -> dict[str, Any] | None:
    if path_payload is None:
        return None
    path, payload = path_payload
    return {"path": str(path), "payload": payload}


def failure_payload(code: str, message: str, **extra: Any) -> dict[str, Any]:
    payload = {
        "code": code,
        "message": message,
        "hint": FAILURE_HINTS.get(code),
    }
    payload.update(extra)
    return payload


def parse_properties(text: str) -> dict[str, str]:
    properties: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition("=")
        if separator:
            properties[key] = value
    return properties


def systemctl_show(unit: str, properties: list[str]) -> dict[str, Any]:
    command = ["systemctl", "--user", "show", unit, "--no-pager"]
    for prop in properties:
        command.extend(["-p", prop])
    try:
        result = subprocess.run(command, capture_output=True, check=False, text=True, timeout=5)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"unit": unit, "available": False, "error": str(error)}

    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        return {"unit": unit, "available": False, "error": message}

    parsed = parse_properties(result.stdout)
    load_state = parsed.get("LoadState")
    return {
        "unit": unit,
        "available": load_state == "loaded",
        "loadState": load_state,
        "activeState": parsed.get("ActiveState"),
        "unitFileState": parsed.get("UnitFileState"),
        "result": parsed.get("Result"),
        "execMainStatus": parsed.get("ExecMainStatus"),
        "nextElapse": parsed.get("NextElapseUSecRealtime"),
        "lastTrigger": parsed.get("LastTriggerUSec"),
        "execMainStart": parsed.get("ExecMainStartTimestamp"),
        "execMainExit": parsed.get("ExecMainExitTimestamp"),
    }


def automation_status() -> dict[str, Any]:
    return {
        "timer": systemctl_show(TIMER_NAME, TIMER_PROPERTIES),
        "service": systemctl_show(SERVICE_NAME, SERVICE_PROPERTIES),
        "auditTimer": systemctl_show(AUDIT_TIMER_NAME, TIMER_PROPERTIES),
        "auditService": systemctl_show(AUDIT_SERVICE_NAME, SERVICE_PROPERTIES),
    }


def health_status(entry: dict[str, Any] | None) -> dict[str, Any] | None:
    if entry is None:
        return None
    payload = entry["payload"]
    counts = nested_get(payload, ["db", "snapshot", "counts"], {})
    alignment = payload.get("alignment", {})
    local = payload.get("local", {})
    guardrails = payload.get("guardrails", {})
    warnings = guardrails.get("warnings", [])
    return {
        "path": entry["path"],
        "runId": payload.get("runId"),
        "finishedAt": payload.get("finishedAt"),
        "ageHours": record_age_hours(payload.get("finishedAt")),
        "verified": nested_get(payload, ["db", "verified"], False),
        "counts": {
            "complexes": counts.get("apt_complexes"),
            "sale": counts.get("apt_transactions"),
            "rent": counts.get("apt_rent_transactions"),
            "pageViews": counts.get("page_views"),
        },
        "local": {
            "sizeBytes": local.get("sizeBytes"),
            "saleUniqueRows": nested_get(local, ["status", "uniqueSaleRows"]),
            "rentUniqueRows": nested_get(local, ["status", "uniqueRentRows"]),
        },
        "alignment": {
            "saleDelta": nested_get(alignment, ["sale", "deltaLocalMinusDb"]),
            "rentDelta": nested_get(alignment, ["rent", "deltaLocalMinusDb"]),
        },
        "warnings": warnings if isinstance(warnings, list) else [],
    }


def backup_status(entry: dict[str, Any] | None) -> dict[str, Any] | None:
    if entry is None:
        return None
    payload = entry["payload"]
    upload = payload.get("uploadResult", {})
    return {
        "path": entry["path"],
        "runId": payload.get("runId"),
        "finishedAt": payload.get("finishedAt"),
        "batches": payload.get("batches"),
        "months": payload.get("months"),
        "kind": payload.get("kind"),
        "dbVerified": payload.get("dbVerified"),
        "upload": {
            "insertedComplexes": upload.get("insertedComplexes"),
            "insertedSaleRows": upload.get("insertedSaleRows"),
            "insertedRentRows": upload.get("insertedRentRows"),
            "localSaleRows": upload.get("localSaleRows"),
            "localRentRows": upload.get("localRentRows"),
        },
    }


def maintenance_status(entry: dict[str, Any] | None) -> dict[str, Any] | None:
    if entry is None:
        return None
    payload = entry["payload"]
    decision = nested_get(payload, ["backup", "decision"], {})
    prune = payload.get("prune", {})
    return {
        "path": entry["path"],
        "runId": payload.get("runId"),
        "finishedAt": payload.get("finishedAt"),
        "ageHours": record_age_hours(payload.get("finishedAt")),
        "healthExit": nested_get(payload, ["health", "exit"]),
        "backupDecision": decision.get("reason") if isinstance(decision, dict) else None,
        "prune": {
            "dryRun": prune.get("dryRun") if isinstance(prune, dict) else None,
            "candidateCount": prune.get("candidateCount") if isinstance(prune, dict) else None,
            "deletedCount": prune.get("deletedCount") if isinstance(prune, dict) else None,
            "freedBytes": prune.get("freedBytes") if isinstance(prune, dict) else None,
        },
    }


def timer_audit_status(entry: dict[str, Any] | None) -> dict[str, Any] | None:
    if entry is None:
        return None
    payload = entry["payload"]
    decision = payload.get("decision", {})
    return {
        "path": entry["path"],
        "runId": payload.get("runId"),
        "finishedAt": payload.get("finishedAt"),
        "ageHours": record_age_hours(payload.get("finishedAt")),
        "requireTrigger": payload.get("requireTrigger"),
        "decision": {
            "status": decision.get("status") if isinstance(decision, dict) else None,
            "reason": decision.get("reason") if isinstance(decision, dict) else None,
            "exitCode": decision.get("exitCode") if isinstance(decision, dict) else None,
            "nextElapse": decision.get("nextElapse") if isinstance(decision, dict) else None,
            "lastTrigger": decision.get("lastTrigger") if isinstance(decision, dict) else None,
        },
        "failureCodes": nested_get(payload, ["decision", "failureCodes"], []),
    }


def build_status(data_dir: Path, include_automation: bool = True) -> dict[str, Any]:
    runs_dir = data_dir / "runs"
    health = file_entry(latest_json(runs_dir, "db-health"))
    backup = file_entry(latest_json(runs_dir, "backup"))
    maintenance = file_entry(latest_json(runs_dir, "maintenance"))
    timer_audit = file_entry(latest_timer_audit_json(runs_dir))
    status = {
        "dataDir": str(data_dir),
        "runsDir": str(runs_dir),
        "health": health_status(health),
        "backup": backup_status(backup),
        "maintenance": maintenance_status(maintenance),
        "timerAudit": timer_audit_status(timer_audit),
    }
    if include_automation:
        status["automation"] = automation_status()
    return status


def prefixed_code(prefix: str, code: str) -> str:
    return f"{prefix}_{code}" if prefix else code


def timer_failures(timer: Any, unit: str, label: str, prefix: str = "") -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    if not isinstance(timer, dict) or not timer.get("available"):
        failures.append(failure_payload(
            prefixed_code(prefix, "timer_unavailable"),
            f"{label} timer unit is not loaded.",
            unit=unit,
            state=timer.get("loadState") if isinstance(timer, dict) else None,
        ))
        return failures

    if timer.get("unitFileState") not in ENABLED_UNIT_STATES:
        failures.append(failure_payload(
            prefixed_code(prefix, "timer_not_enabled"),
            f"{label} timer is not enabled.",
            unit=unit,
            state=timer.get("unitFileState"),
        ))
    if timer.get("activeState") != "active":
        failures.append(failure_payload(
            prefixed_code(prefix, "timer_not_active"),
            f"{label} timer is not active.",
            unit=unit,
            state=timer.get("activeState"),
        ))
    if not timer.get("nextElapse"):
        failures.append(failure_payload(
            prefixed_code(prefix, "timer_not_scheduled"),
            f"{label} timer does not have a next scheduled run.",
            unit=unit,
        ))
    return failures


def service_failures(service: Any, unit: str, label: str, prefix: str = "") -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    if not isinstance(service, dict) or not service.get("available"):
        failures.append(failure_payload(
            prefixed_code(prefix, "service_unavailable"),
            f"{label} service unit is not loaded.",
            unit=unit,
            state=service.get("loadState") if isinstance(service, dict) else None,
        ))
        return failures

    if service.get("activeState") == "failed":
        failures.append(failure_payload(
            prefixed_code(prefix, "service_active_failed"),
            f"{label} service is in failed state.",
            unit=unit,
            state=service.get("activeState"),
        ))
    result = service.get("result") or ""
    if result not in SUCCESS_SERVICE_RESULTS:
        failures.append(failure_payload(
            prefixed_code(prefix, "service_failed"),
            f"Latest {label.lower()} service result was not successful.",
            unit=unit,
            result=result,
        ))
    status_code = service.get("execMainStatus")
    if status_code not in (None, "", "0"):
        failures.append(failure_payload(
            prefixed_code(prefix, "service_exit_nonzero"),
            f"Latest {label.lower()} service exit status was not zero.",
            unit=unit,
            exit=status_code,
        ))
    return failures


def automation_failures(status: dict[str, Any]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    automation = status.get("automation")
    if not isinstance(automation, dict):
        return [failure_payload("automation_missing", "Automation status was not collected.")]

    failures.extend(timer_failures(automation.get("timer"), TIMER_NAME, "Maintenance"))
    failures.extend(service_failures(automation.get("service"), SERVICE_NAME, "Maintenance"))
    failures.extend(
        timer_failures(automation.get("auditTimer"), AUDIT_TIMER_NAME, "Audit", prefix="audit")
    )
    failures.extend(
        service_failures(
            automation.get("auditService"),
            AUDIT_SERVICE_NAME,
            "Audit",
            prefix="audit",
        )
    )

    return failures


def timer_audit_failures(
    timer_audit: Any,
    max_timer_audit_age_hours: float,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    if max_timer_audit_age_hours <= 0:
        return failures

    if not isinstance(timer_audit, dict):
        return [failure_payload(
            "timer_audit_missing",
            "No timer-audit record is available.",
            maxAgeHours=max_timer_audit_age_hours,
        )]

    if timer_audit.get("requireTrigger") is not True:
        failures.append(failure_payload(
            "timer_audit_not_required",
            "Latest selected timer-audit record is not a required audit.",
            runId=timer_audit.get("runId"),
        ))

    decision = timer_audit.get("decision", {})
    decision_status = decision.get("status") if isinstance(decision, dict) else None
    if decision_status != "ok":
        failures.append(failure_payload(
            "timer_audit_not_ok",
            "Latest required timer-audit record did not pass.",
            runId=timer_audit.get("runId"),
            status=decision_status,
            failureCodes=timer_audit.get("failureCodes", []),
        ))

    age_hours = record_age_hours(timer_audit.get("finishedAt"), now)
    timer_audit["ageHours"] = age_hours
    if age_hours is None:
        failures.append(failure_payload(
            "timer_audit_time_unknown",
            "Latest timer-audit record does not have a valid finishedAt timestamp.",
            runId=timer_audit.get("runId"),
            maxAgeHours=max_timer_audit_age_hours,
        ))
    elif age_hours > max_timer_audit_age_hours:
        failures.append(failure_payload(
            "timer_audit_stale",
            "Latest timer-audit record is too old.",
            runId=timer_audit.get("runId"),
            ageHours=round(age_hours, 2),
            maxAgeHours=max_timer_audit_age_hours,
        ))
    return failures


def status_failures(
    status: dict[str, Any],
    fail_on_warning: bool,
    fail_on_automation: bool = False,
    max_health_age_hours: float = 0,
    max_maintenance_age_hours: float = 0,
    max_timer_audit_age_hours: float = 0,
    now: datetime | None = None,
) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    if not fail_on_warning and not fail_on_automation:
        if (
            max_health_age_hours <= 0
            and max_maintenance_age_hours <= 0
            and max_timer_audit_age_hours <= 0
        ):
            return failures

    health = status.get("health")
    health_missing_reported = False

    if fail_on_warning and not health:
        failures.append(failure_payload("health_missing", "No db-health record is available."))
        health_missing_reported = True
    elif fail_on_warning and isinstance(health, dict):
        if not health.get("verified"):
            failures.append(failure_payload(
                "db_not_verified",
                "Latest db-health record did not verify the database.",
                runId=health.get("runId"),
            ))

        warnings = health.get("warnings", [])
        if warnings:
            failures.append(failure_payload(
                "health_warnings",
                "Latest db-health record contains warnings.",
                runId=health.get("runId"),
                count=len(warnings),
            ))

    if max_health_age_hours > 0:
        if not isinstance(health, dict):
            if not health_missing_reported:
                failures.append(failure_payload("health_missing", "No db-health record is available."))
        else:
            age_hours = record_age_hours(health.get("finishedAt"), now)
            health["ageHours"] = age_hours
            if age_hours is None:
                failures.append(failure_payload(
                    "health_time_unknown",
                    "Latest db-health record does not have a valid finishedAt timestamp.",
                    runId=health.get("runId"),
                    maxAgeHours=max_health_age_hours,
                ))
            elif age_hours > max_health_age_hours:
                failures.append(failure_payload(
                    "health_stale",
                    "Latest db-health record is too old.",
                    runId=health.get("runId"),
                    ageHours=round(age_hours, 2),
                    maxAgeHours=max_health_age_hours,
                ))

    maintenance = status.get("maintenance")
    if max_maintenance_age_hours > 0:
        if not isinstance(maintenance, dict):
            failures.append(failure_payload(
                "maintenance_missing",
                "No maintenance record is available.",
            ))
        else:
            age_hours = record_age_hours(maintenance.get("finishedAt"), now)
            maintenance["ageHours"] = age_hours
            if age_hours is None:
                failures.append(failure_payload(
                    "maintenance_time_unknown",
                    "Latest maintenance record does not have a valid finishedAt timestamp.",
                    runId=maintenance.get("runId"),
                    maxAgeHours=max_maintenance_age_hours,
                ))
            elif age_hours > max_maintenance_age_hours:
                failures.append(failure_payload(
                    "maintenance_stale",
                    "Latest maintenance record is too old.",
                    runId=maintenance.get("runId"),
                    ageHours=round(age_hours, 2),
                    maxAgeHours=max_maintenance_age_hours,
                ))

    failures.extend(timer_audit_failures(
        status.get("timerAudit"),
        max_timer_audit_age_hours,
        now,
    ))

    if fail_on_automation:
        failures.extend(automation_failures(status))

    return failures


def append_timer_line(lines: list[str], label: str, timer: Any) -> None:
    if isinstance(timer, dict) and timer.get("available"):
        lines.append(
            f"{label}: "
            f"enabled={timer.get('unitFileState')} "
            f"active={timer.get('activeState')} "
            f"next={format_optional(timer.get('nextElapse'))} "
            f"lastTrigger={format_optional(timer.get('lastTrigger'))}"
        )
        return
    state = timer.get("loadState") if isinstance(timer, dict) else None
    lines.append(f"{label}: available=false state={state or 'n/a'}")


def append_service_line(lines: list[str], label: str, service: Any) -> None:
    if isinstance(service, dict) and service.get("available"):
        lines.append(
            f"{label}: "
            f"active={service.get('activeState')} "
            f"result={format_optional(service.get('result'))} "
            f"exit={format_optional(service.get('execMainStatus'))} "
            f"started={format_optional(service.get('execMainStart'))} "
            f"finished={format_optional(service.get('execMainExit'))}"
        )
        return
    state = service.get("loadState") if isinstance(service, dict) else None
    lines.append(f"{label}: available=false state={state or 'n/a'}")


def format_lines(status: dict[str, Any]) -> list[str]:
    lines = ["DonJup DB status"]
    health = status.get("health")
    if health:
        counts = health["counts"]
        local = health["local"]
        alignment = health["alignment"]
        lines.append(
            "health: "
            f"run={health.get('runId')} "
            f"verified={str(health.get('verified')).lower()} "
            f"warnings={len(health.get('warnings', []))} "
            f"age={format_hours(health.get('ageHours'))}"
        )
        lines.append(
            "db: "
            f"complexes={counts.get('complexes')} "
            f"sale={counts.get('sale')} "
            f"rent={counts.get('rent')} "
            f"pageViews={counts.get('pageViews')}"
        )
        lines.append(
            "local: "
            f"size={format_mb(local.get('sizeBytes'))} "
            f"saleUnique={local.get('saleUniqueRows')} "
            f"rentUnique={local.get('rentUniqueRows')}"
        )
        lines.append(
            "alignment: "
            f"saleDelta={alignment.get('saleDelta')} "
            f"rentDelta={alignment.get('rentDelta')}"
        )
        for warning in health.get("warnings", []):
            lines.append(
                "warning: "
                f"{warning.get('code')} "
                f"current={warning.get('current')} "
                f"threshold={warning.get('threshold')}"
            )
    else:
        lines.append("health: none")

    backup = status.get("backup")
    if backup:
        upload = backup["upload"]
        lines.append(
            "backup: "
            f"run={backup.get('runId')} "
            f"kind={backup.get('kind')} "
            f"months={backup.get('months')} "
            f"dbVerified={str(backup.get('dbVerified')).lower()}"
        )
        lines.append(
            "backup upload: "
            f"complexes={upload.get('insertedComplexes')} "
            f"sale={upload.get('insertedSaleRows')} "
            f"rent={upload.get('insertedRentRows')}"
        )
    else:
        lines.append("backup: none")

    maintenance = status.get("maintenance")
    if maintenance:
        prune = maintenance["prune"]
        lines.append(
            "maintenance: "
            f"run={maintenance.get('runId')} "
            f"backup={maintenance.get('backupDecision')} "
            f"healthExit={maintenance.get('healthExit')} "
            f"age={format_hours(maintenance.get('ageHours'))}"
        )
        lines.append(
            "prune: "
            f"dryRun={str(prune.get('dryRun')).lower()} "
            f"candidates={prune.get('candidateCount')} "
            f"deleted={prune.get('deletedCount')}"
        )
    else:
        lines.append("maintenance: none")

    timer_audit = status.get("timerAudit")
    if timer_audit:
        decision = timer_audit["decision"]
        lines.append(
            "timer audit: "
            f"run={timer_audit.get('runId')} "
            f"status={decision.get('status')} "
            f"reason={decision.get('reason')} "
            f"requireTrigger={str(timer_audit.get('requireTrigger')).lower()} "
            f"age={format_hours(timer_audit.get('ageHours'))}"
        )
    else:
        lines.append("timer audit: none")

    automation = status.get("automation")
    if isinstance(automation, dict):
        append_timer_line(lines, "timer", automation.get("timer"))
        append_service_line(lines, "service", automation.get("service"))
        append_timer_line(lines, "audit timer", automation.get("auditTimer"))
        append_service_line(lines, "audit service", automation.get("auditService"))

    lines.append(f"runs: {status.get('runsDir')}")
    return lines


def main() -> int:
    parser = argparse.ArgumentParser(description="Show latest DonJup DB maintenance status.")
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON")
    parser.add_argument("--data-dir", default=None, help="override local data directory")
    parser.add_argument(
        "--fail-on-warning",
        action="store_true",
        help="exit with code 2 when latest health is missing, unverified, or has warnings",
    )
    parser.add_argument(
        "--no-automation",
        action="store_true",
        help="skip systemd timer/service status lookup",
    )
    parser.add_argument(
        "--fail-on-automation",
        action="store_true",
        help="exit with code 2 when maintenance timer/service is unavailable, disabled, inactive, or failed",
    )
    parser.add_argument(
        "--max-health-age-hours",
        type=nonnegative_float,
        default=0,
        help="exit with code 2 when latest health record is older than this many hours; 0 disables",
    )
    parser.add_argument(
        "--max-maintenance-age-hours",
        type=nonnegative_float,
        default=0,
        help="exit with code 2 when latest maintenance record is older than this many hours; 0 disables",
    )
    parser.add_argument(
        "--max-timer-audit-age-hours",
        type=nonnegative_float,
        default=0,
        help="exit with code 2 when latest required timer-audit record is missing, failed, or too old; 0 disables",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir) if args.data_dir else local_data_dir()
    include_automation = not args.no_automation or args.fail_on_automation
    status = build_status(data_dir, include_automation=include_automation)
    failures = status_failures(
        status,
        args.fail_on_warning,
        args.fail_on_automation,
        args.max_health_age_hours,
        args.max_maintenance_age_hours,
        args.max_timer_audit_age_hours,
    )
    status["checks"] = {"failures": failures}

    if args.json:
        print(json.dumps(status, ensure_ascii=False, indent=2))
    else:
        print("\n".join(format_lines(status)))
        for failure in failures:
            print(f"check failed: {failure['code']} - {failure['message']}", file=sys.stderr)
            if failure.get("hint"):
                print(f"next: {failure['hint']}", file=sys.stderr)
    return 2 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
