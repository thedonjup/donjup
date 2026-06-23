#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from donjup_ops_lock import LockBusyError, acquire_flock, release_flock


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"
EXTENDED_LOCK_FILE = "extended-period.lock"


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def local_data_dir() -> Path:
    return Path(os.environ.get("DONJUP_LOCAL_DATA_DIR") or DEFAULT_DATA_DIR)


def runs_dir() -> Path:
    path = local_data_dir() / "runs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def extended_lock_path() -> Path:
    return local_data_dir() / EXTENDED_LOCK_FILE


def recent_year_months(count: int, now: datetime | None = None) -> list[str]:
    checked_at = now or datetime.now(timezone.utc) + timedelta(hours=9)
    year = checked_at.year
    month = checked_at.month
    months: list[str] = []
    for offset in range(count):
        current_month = month - offset
        current_year = year
        while current_month <= 0:
            current_month += 12
            current_year -= 1
        months.append(f"{current_year}{current_month:02d}")
    return months


def months_for_args(args: argparse.Namespace) -> list[str]:
    if args.ym:
        return [part.strip().replace("-", "") for part in args.ym.split(",") if part.strip()]
    batch_months = {"A": 3, "B": 6, "C": 12, "D": 24}
    return recent_year_months(batch_months[args.batch])


def append_log(path: Path, title: str, text: str) -> None:
    with path.open("a", encoding="utf-8") as handle:
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


def last_json_object(output: str) -> dict[str, Any] | None:
    decoder = json.JSONDecoder()
    best: dict[str, Any] | None = None
    best_length = -1
    for index, char in enumerate(output):
        if char != "{":
            continue
        try:
            parsed, parsed_length = decoder.raw_decode(output[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict) and parsed_length > best_length:
            best = parsed
            best_length = parsed_length
    return best


def write_summary(path: Path, summary: dict[str, Any]) -> None:
    path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run DonJup extended-period local collection and scoped upload.")
    parser.add_argument("--batch", choices=["A", "B", "C", "D"], default="A")
    parser.add_argument("--run-id")
    parser.add_argument("--ym", help="comma-separated explicit YYYYMM list; overrides --batch")
    parser.add_argument("--kind", choices=["sale", "rent", "both"], default="both")
    parser.add_argument("--sido")
    parser.add_argument("--region")
    parser.add_argument("--region-batch", type=int, choices=[0, 1, 2, 3, 4])
    parser.add_argument("--limit-regions", type=int)
    parser.add_argument("--max-requests", type=int, default=140)
    parser.add_argument("--max-runtime-seconds", type=int, default=1800)
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--retry-delay-ms", type=int, default=30000)
    parser.add_argument("--timeout-ms", type=int, default=20000)
    parser.add_argument("--max-upserts", type=int, default=100000)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--refresh-cache", action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument("--recalculate", action=argparse.BooleanOptionalAction, default=True)
    args = parser.parse_args()

    run_id = args.run_id or f"extended-period-{timestamp()}-{args.batch.lower()}"
    run_dir = runs_dir() / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    log_path = run_dir / "runner.log"
    summary_path = run_dir / "runner-summary.json"
    months = months_for_args(args)
    summary: dict[str, Any] = {
        "runId": run_id,
        "batch": args.batch,
        "months": months,
        "kind": args.kind,
        "apply": args.apply,
        "maxRequests": args.max_requests,
        "maxRuntimeSeconds": args.max_runtime_seconds,
        "maxUpserts": args.max_upserts,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "runDir": str(run_dir),
        "logPath": str(log_path),
    }

    try:
        lock_handle = acquire_flock(extended_lock_path(), purpose="extended-period")
    except LockBusyError as error:
        print(
            f"extended-period locked: {error.path} "
            f"metadata={json.dumps(error.metadata, ensure_ascii=False)}",
            flush=True,
        )
        return 75

    try:
        print(f"extended-period run: {run_id}", flush=True)
        print(f"log: {log_path}", flush=True)

        collect_command = [
            "node",
            "scripts/local-data-pipeline.mjs",
            "extended-collect",
            f"--run-id={run_id}",
            f"--kind={args.kind}",
            f"--max-requests={args.max_requests}",
            f"--max-runtime-seconds={args.max_runtime_seconds}",
            f"--max-retries={args.max_retries}",
            f"--retry-delay-ms={args.retry_delay_ms}",
            f"--timeout-ms={args.timeout_ms}",
        ]
        if args.ym:
            collect_command.append(f"--ym={','.join(months)}")
        else:
            collect_command.append(f"--batch={args.batch}")
        if args.sido:
            collect_command.append(f"--sido={args.sido}")
        if args.region:
            collect_command.append(f"--region={args.region}")
        if args.region_batch is not None:
            collect_command.append(f"--region-batch={args.region_batch}")
        if args.limit_regions:
            collect_command.append(f"--limit-regions={args.limit_regions}")

        collect = run_command(collect_command, log_path, "extended collect")
        summary["collectExit"] = collect.returncode
        summary["collect"] = last_json_object(collect.stdout)
        if collect.returncode != 0:
            summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
            write_summary(summary_path, summary)
            print(f"collect failed; summary: {summary_path}", flush=True)
            return collect.returncode

        upload_command = [
            "node",
            "scripts/local-data-pipeline.mjs",
            "upload",
            f"--run-id={run_id}",
            f"--ym={','.join(months)}",
            f"--max-upserts={args.max_upserts}",
            f"--refresh-cache={'true' if args.refresh_cache else 'false'}",
            f"--recalculate={'true' if args.recalculate else 'false'}",
        ]
        dry_run = run_command(upload_command, log_path, "scoped upload dry-run")
        summary["uploadDryRunExit"] = dry_run.returncode
        summary["uploadDryRun"] = last_json_object(dry_run.stdout)
        if dry_run.returncode != 0:
            summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
            write_summary(summary_path, summary)
            print(f"upload dry-run failed; summary: {summary_path}", flush=True)
            return dry_run.returncode

        if args.apply:
            apply_command = upload_command + ["--apply=true"]
            applied = run_command(apply_command, log_path, "scoped upload apply")
            summary["uploadApplyExit"] = applied.returncode
            summary["uploadApply"] = last_json_object(applied.stdout)
            if applied.returncode != 0:
                summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
                write_summary(summary_path, summary)
                print(f"upload apply failed; summary: {summary_path}", flush=True)
                return applied.returncode
        else:
            summary["uploadApplyExit"] = None

        summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
        write_summary(summary_path, summary)
        print(f"summary: {summary_path}", flush=True)
        return 0
    finally:
        release_flock(lock_handle)


if __name__ == "__main__":
    sys.exit(main())
