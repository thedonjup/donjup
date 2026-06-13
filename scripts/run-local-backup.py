#!/usr/bin/env python3
"""Run DonJup local backup batches with compact console output.

The detailed collection/upload output is written to .donjup-local-data/runs.
This keeps interactive logs small while preserving enough detail to audit or resume.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"


def local_data_dir() -> Path:
    return Path(os.environ.get("DONJUP_LOCAL_DATA_DIR") or DEFAULT_DATA_DIR)


def run_dir() -> Path:
    path = local_data_dir() / "runs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def parse_batches(value: str) -> list[int]:
    batches = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        batch = int(part)
        if batch < 0 or batch > 4:
            raise argparse.ArgumentTypeError("batch must be between 0 and 4")
        batches.append(batch)
    if not batches:
        raise argparse.ArgumentTypeError("at least one batch is required")
    return batches


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
    command_text = " ".join(args)
    append_log(
        log_path,
        title,
        f"$ {command_text}\n# exit={completed.returncode} elapsed={elapsed:.1f}s\n{completed.stdout}",
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


def write_summary(summary_path: Path, summary: dict[str, Any]) -> None:
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def verify_db(log_path: Path, retries: int, delay_seconds: int) -> bool:
    for attempt in range(1, retries + 1):
        completed = run_command(
            ["node", "scripts/local-data-pipeline.mjs", "verify-db"],
            log_path,
            f"verify-db attempt {attempt}",
        )
        if completed.returncode == 0:
            return True
        if attempt < retries:
            time.sleep(delay_seconds)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Run DonJup local backup batches.")
    parser.add_argument(
        "--batches",
        type=parse_batches,
        default=parse_batches("2,3,4"),
        help="comma-separated batch list, default: 2,3,4",
    )
    parser.add_argument("--months", type=int, default=1, help="month count, default: 1")
    parser.add_argument(
        "--kind",
        choices=["sale", "rent", "both"],
        default="both",
        help="data kind to collect, default: both",
    )
    parser.add_argument(
        "--upload",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="upload after collection when DB verification passes, default: true",
    )
    parser.add_argument("--verify-retries", type=int, default=3)
    parser.add_argument("--verify-delay", type=int, default=10)
    args = parser.parse_args()

    run_id = timestamp()
    logs = run_dir()
    log_path = logs / f"backup-{run_id}.log"
    summary_path = logs / f"backup-{run_id}.json"
    summary: dict[str, Any] = {
        "runId": run_id,
        "batches": args.batches,
        "months": args.months,
        "kind": args.kind,
        "upload": args.upload,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "steps": [],
        "logPath": str(log_path),
    }

    print(f"backup run: {run_id}", flush=True)
    print(f"log: {log_path}", flush=True)

    status_before = run_command(
        ["node", "scripts/local-data-pipeline.mjs", "status"],
        log_path,
        "status before",
    )
    summary["statusBefore"] = last_json_object(status_before.stdout)

    for batch in args.batches:
        print(f"collect batch {batch}...", flush=True)
        completed = run_command(
            [
                "node",
                "scripts/local-data-pipeline.mjs",
                "collect",
                f"--kind={args.kind}",
                f"--months={args.months}",
                f"--batch={batch}",
            ],
            log_path,
            f"collect batch {batch}",
        )
        parsed = last_json_object(completed.stdout)
        summary["steps"].append({
            "batch": batch,
            "exit": completed.returncode,
            "summary": parsed,
        })
        if completed.returncode != 0:
            write_summary(summary_path, summary)
            print(f"batch {batch} failed; see log", flush=True)
            return completed.returncode
        print(f"batch {batch} done: {json.dumps(parsed, ensure_ascii=False)}", flush=True)

    status_after_collect = run_command(
        ["node", "scripts/local-data-pipeline.mjs", "status"],
        log_path,
        "status after collect",
    )
    summary["statusAfterCollect"] = last_json_object(status_after_collect.stdout)

    if args.upload:
        print("verify db before upload...", flush=True)
        db_ok = verify_db(log_path, args.verify_retries, args.verify_delay)
        summary["dbVerified"] = db_ok
        if db_ok:
            print("upload apply...", flush=True)
            upload = run_command(
                ["node", "scripts/local-data-pipeline.mjs", "upload", "--apply=true"],
                log_path,
                "upload apply",
            )
            summary["uploadResult"] = last_json_object(upload.stdout)
            summary["uploadExit"] = upload.returncode
            if upload.returncode != 0:
                write_summary(summary_path, summary)
                print("upload failed; see log", flush=True)
                return upload.returncode
            print(f"upload done: {json.dumps(summary['uploadResult'], ensure_ascii=False)}", flush=True)
        else:
            print("db verify failed; local backup retained, upload skipped", flush=True)
    else:
        summary["dbVerified"] = None

    status_final = run_command(
        ["node", "scripts/local-data-pipeline.mjs", "status"],
        log_path,
        "status final",
    )
    summary["statusFinal"] = last_json_object(status_final.stdout)
    summary["finishedAt"] = datetime.now(timezone.utc).isoformat()
    write_summary(summary_path, summary)
    print(f"summary: {summary_path}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
