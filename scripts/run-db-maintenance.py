#!/usr/bin/env python3
"""Run the compact DonJup DB maintenance flow."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from donjup_ops_lock import LockBusyError, acquire_flock, release_flock


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"
DEFAULT_BACKUP_BATCHES = "0,1,2,3,4"
RUN_FILE_PREFIXES = ("backup-", "db-health-", "maintenance-", "timer-audit-")
RUN_FILE_SUFFIXES = (".json", ".log")
LOCK_FILE = "maintenance.lock"
EXTENDED_LOCK_FILE = "extended-period.lock"


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def local_data_dir() -> Path:
    return Path(os.environ.get("DONJUP_LOCAL_DATA_DIR") or DEFAULT_DATA_DIR)


def ensure_local_data_dir() -> Path:
    path = local_data_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def runs_dir() -> Path:
    path = ensure_local_data_dir() / "runs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def maintenance_lock_path() -> Path:
    return ensure_local_data_dir() / LOCK_FILE


def extended_lock_path() -> Path:
    return ensure_local_data_dir() / EXTENDED_LOCK_FILE


def acquire_maintenance_lock(path: Path) -> Any | None:
    handle = path.open("a+", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        return None

    handle.seek(0)
    handle.truncate()
    handle.write(
        json.dumps(
            {
                "pid": os.getpid(),
                "startedAt": datetime.now(timezone.utc).isoformat(),
            },
            ensure_ascii=False,
        )
    )
    handle.write("\n")
    handle.flush()
    return handle


def release_maintenance_lock(handle: Any) -> None:
    handle.seek(0)
    handle.truncate()
    handle.flush()
    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    handle.close()


def append_log(log_path: Path, title: str, text: str) -> None:
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(f"\n\n===== {title} =====\n")
        handle.write(text)
        if text and not text.endswith("\n"):
            handle.write("\n")


def run_command(args: list[str], log_path: Path, title: str) -> subprocess.CompletedProcess[str]:
    started = time.monotonic()
    completed = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    elapsed = time.monotonic() - started
    append_log(
        log_path,
        title,
        f"$ {' '.join(args)}\n# exit={completed.returncode} elapsed={elapsed:.1f}s\n{completed.stdout}",
    )
    return completed


def read_json_file(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def parse_summary_path(output: str) -> Path | None:
    for line in reversed(output.splitlines()):
        if line.startswith("summary: "):
            return Path(line.removeprefix("summary: ").strip())
    return None


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


def latest_backup() -> tuple[Path, dict[str, Any] | None] | None:
    summaries = sorted(runs_dir().glob("backup-*.json"))
    if not summaries:
        return None
    path = summaries[-1]
    return path, read_json_file(path)


def backup_age_hours(path: Path, payload: dict[str, Any] | None) -> float:
    finished_at = parse_iso_datetime((payload or {}).get("finishedAt"))
    checked_at = finished_at or datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    return max(0.0, (datetime.now(timezone.utc) - checked_at).total_seconds() / 3600)


def should_run_backup(args: argparse.Namespace, log_path: Path) -> tuple[bool, dict[str, Any]]:
    if args.no_backup:
        return False, {"reason": "disabled"}
    if args.force_backup:
        return True, {"reason": "forced"}

    latest = latest_backup()
    if latest is None:
        return True, {"reason": "no-backup"}

    path, payload = latest
    age_hours = backup_age_hours(path, payload)
    decision = {
        "reason": "stale" if age_hours >= args.max_backup_age_hours else "fresh",
        "latestBackupPath": str(path),
        "latestBackupRunId": (payload or {}).get("runId"),
        "latestBackupFinishedAt": (payload or {}).get("finishedAt"),
        "ageHours": round(age_hours, 2),
        "maxBackupAgeHours": args.max_backup_age_hours,
    }
    append_log(log_path, "backup freshness", json.dumps(decision, ensure_ascii=False, indent=2))
    return age_hours >= args.max_backup_age_hours, decision


def backup_command(args: argparse.Namespace) -> list[str]:
    command = [
        "python3",
        "scripts/run-local-backup.py",
        f"--batches={args.batches}",
        f"--months={args.months}",
        f"--kind={args.kind}",
        f"--verify-retries={args.verify_retries}",
        f"--verify-delay={args.verify_delay}",
    ]
    command.append("--upload" if args.upload else "--no-upload")
    return command


def write_summary(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_history_files(path: Path) -> list[Path]:
    if not path.exists():
        return []

    return [
        item
        for item in path.iterdir()
        if item.is_file()
        and item.name.startswith(RUN_FILE_PREFIXES)
        and item.suffix in RUN_FILE_SUFFIXES
    ]


def protected_latest_run_files(files: list[Path]) -> set[Path]:
    protected: set[Path] = set()

    for prefix in RUN_FILE_PREFIXES:
        stems = sorted({item.stem for item in files if item.name.startswith(prefix)})
        if not stems:
            continue
        latest_stem = stems[-1]
        protected.update(item for item in files if item.stem == latest_stem)

    return protected


def prune_run_history(
    path: Path,
    max_age_days: int,
    dry_run: bool,
    now: datetime | None = None,
) -> dict[str, Any]:
    checked_at = now or datetime.now(timezone.utc)
    cutoff = checked_at.timestamp() - (max_age_days * 24 * 60 * 60)
    files = run_history_files(path)
    protected = protected_latest_run_files(files)
    candidates = [
        item
        for item in files
        if item not in protected and item.stat().st_mtime < cutoff
    ]
    deleted: list[dict[str, Any]] = []
    failed: list[dict[str, str]] = []

    for item in sorted(candidates):
        size = item.stat().st_size
        entry = {"path": str(item), "sizeBytes": size}
        if not dry_run:
            try:
                item.unlink()
            except OSError as error:
                failed.append({"path": str(item), "error": str(error)})
                continue
        deleted.append(entry)

    return {
        "dryRun": dry_run,
        "maxAgeDays": max_age_days,
        "checkedAt": checked_at.isoformat(),
        "candidateCount": len(candidates),
        "deletedCount": 0 if dry_run else len(deleted),
        "freedBytes": 0 if dry_run else sum(item["sizeBytes"] for item in deleted),
        "protectedCount": len(protected),
        "deleted": deleted,
        "failed": failed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Run DonJup DB health and stale-backup maintenance.")
    parser.add_argument("--max-backup-age-hours", type=int, default=24)
    parser.add_argument("--force-backup", action="store_true")
    parser.add_argument("--no-backup", action="store_true")
    parser.add_argument("--batches", default=DEFAULT_BACKUP_BATCHES)
    parser.add_argument("--months", type=int, default=1)
    parser.add_argument("--kind", choices=["sale", "rent", "both"], default="both")
    parser.add_argument("--upload", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--verify-retries", type=int, default=5)
    parser.add_argument("--verify-delay", type=int, default=15)
    parser.add_argument("--prune-run-days", type=int, default=30)
    parser.add_argument("--prune-dry-run", action="store_true")
    parser.add_argument("--no-prune", action="store_true")
    args = parser.parse_args()

    if args.max_backup_age_hours < 0:
        parser.error("--max-backup-age-hours must be 0 or greater")
    if args.prune_run_days < 0:
        parser.error("--prune-run-days must be 0 or greater")

    lock_path = maintenance_lock_path()
    lock_handle = acquire_maintenance_lock(lock_path)
    if lock_handle is None:
        print(f"maintenance locked: {lock_path}", flush=True)
        return 75

    try:
        extended_lock_handle = acquire_flock(extended_lock_path(), purpose="maintenance")
    except LockBusyError as error:
        release_maintenance_lock(lock_handle)
        print(
            f"extended-period locked: {error.path} "
            f"metadata={json.dumps(error.metadata, ensure_ascii=False)}",
            flush=True,
        )
        return 75

    run_id = timestamp()
    log_path = runs_dir() / f"maintenance-{run_id}.log"
    summary_path = runs_dir() / f"maintenance-{run_id}.json"
    summary: dict[str, Any] = {
        "runId": run_id,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "logPath": str(log_path),
        "health": {},
        "backup": {},
    }

    try:
        os.environ["DONJUP_EXTENDED_LOCK_HELD"] = "1"
        print(f"maintenance run: {run_id}", flush=True)
        print(f"log: {log_path}", flush=True)
        print("health check...", flush=True)

        health = run_command(["python3", "scripts/check-db-health.py"], log_path, "health check")
        health_summary_path = parse_summary_path(health.stdout)
        health_summary = read_json_file(health_summary_path) if health_summary_path else None
        summary["health"] = {
            "exit": health.returncode,
            "summaryPath": str(health_summary_path) if health_summary_path else None,
            "summary": health_summary,
        }

        if health.returncode != 0:
            summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
            write_summary(summary_path, summary)
            print("health failed; backup skipped", flush=True)
            print(f"summary: {summary_path}", flush=True)
            return health.returncode

        db_snapshot = (health_summary or {}).get("db", {}).get("snapshot", {})
        counts = db_snapshot.get("counts", {})
        print(
            "health done: "
            f"complexes={counts.get('apt_complexes')} "
            f"sale={counts.get('apt_transactions')} "
            f"rent={counts.get('apt_rent_transactions')}",
            flush=True,
        )

        run_backup, decision = should_run_backup(args, log_path)
        summary["backup"]["decision"] = decision
        if run_backup:
            print(f"backup run: {decision['reason']}", flush=True)
            backup = run_command(backup_command(args), log_path, "backup")
            backup_summary_path = parse_summary_path(backup.stdout)
            summary["backup"].update({
                "exit": backup.returncode,
                "summaryPath": str(backup_summary_path) if backup_summary_path else None,
                "summary": read_json_file(backup_summary_path) if backup_summary_path else None,
            })
            if backup.returncode != 0:
                summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
                write_summary(summary_path, summary)
                print("backup failed; see log", flush=True)
                print(f"summary: {summary_path}", flush=True)
                return backup.returncode
            print(f"backup done: {backup_summary_path}", flush=True)
        else:
            print(f"backup skipped: {decision['reason']}", flush=True)

        if args.no_prune:
            summary["prune"] = {"skipped": True, "reason": "disabled"}
            print("prune skipped: disabled", flush=True)
        else:
            prune = prune_run_history(runs_dir(), args.prune_run_days, args.prune_dry_run)
            summary["prune"] = prune
            append_log(log_path, "prune runs", json.dumps(prune, ensure_ascii=False, indent=2))
            print(
                "prune done: "
                f"candidates={prune['candidateCount']} "
                f"deleted={prune['deletedCount']} "
                f"dryRun={str(prune['dryRun']).lower()}",
                flush=True,
            )

        summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
        write_summary(summary_path, summary)
        print(f"summary: {summary_path}", flush=True)
        return 0
    finally:
        release_maintenance_lock(lock_handle)
        release_flock(extended_lock_handle)


if __name__ == "__main__":
    sys.exit(main())
