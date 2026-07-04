#!/usr/bin/env python3
"""Record DonJup DB and local backup health with compact output."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / ".donjup-local-data"
DEFAULT_LOCAL_DATA_WARN_MB = 8192
DEFAULT_CORE_TRANSACTION_ROWS_WARN = 8_000_000
DEFAULT_PAGEVIEW_ROWS_WARN = 100_000
DEFAULT_LOCAL_DB_DELTA_WARN = 1_000
CORE_TABLES = [
    "apt_complexes",
    "apt_transactions",
    "apt_rent_transactions",
    "finance_rates",
    "daily_reports",
    "page_views",
    "content_queue",
    "seeding_queue",
    "push_subscriptions",
    "reb_price_indices",
    "homepage_cache",
    "analytics_daily",
    "instagram_posts",
]

DB_SNAPSHOT_JS = """
const pg = require("pg");

const tables = JSON.parse(process.env.DONJUP_DB_HEALTH_TABLES || "[]");

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe table name: ${value}`);
  }
  return `"${value}"`;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 1,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 5000,
});

(async () => {
  try {
    const meta = await pool.query(
      "select current_database() as database_name, version() as version, now() as checked_at"
    );
    const publicTables = await pool.query(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
    );
    const counts = {};

    for (const tableName of tables) {
      try {
        const result = await pool.query(
          `select count(*) as row_count from ${quoteIdentifier(tableName)}`
        );
        counts[tableName] = Number(result.rows[0].row_count);
      } catch (error) {
        counts[tableName] = { error: error.message };
      }
    }

    const dateBounds = {};
    for (const [key, tableName] of [
      ["sale", "apt_transactions"],
      ["rent", "apt_rent_transactions"],
    ]) {
      try {
        const result = await pool.query(
          `select min(trade_date) as min_trade_date, max(trade_date) as max_trade_date from ${quoteIdentifier(tableName)}`
        );
        dateBounds[key] = result.rows[0];
      } catch (error) {
        dateBounds[key] = { error: error.message };
      }
    }

    console.log(JSON.stringify({
      ok: true,
      databaseName: meta.rows[0].database_name,
      version: meta.rows[0].version,
      checkedAt: meta.rows[0].checked_at,
      publicTableCount: publicTables.rowCount,
      publicTables: publicTables.rows.map((row) => row.table_name),
      counts,
      dateBounds,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
"""


def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for line in path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue
        if trimmed.startswith("export "):
            trimmed = trimmed.removeprefix("export ").strip()
        key, separator, raw_value = trimmed.partition("=")
        if not separator:
            continue
        key = key.strip()
        if not key or not key.replace("_", "").isalnum():
            continue
        value = raw_value.strip().strip("\"'")
        values[key] = value
    return values


def child_env() -> dict[str, str]:
    env = os.environ.copy()
    env.update({key: value for key, value in parse_env_file(ROOT / ".env.local").items() if key not in env})
    env["DONJUP_DB_HEALTH_TABLES"] = json.dumps(CORE_TABLES)
    return env


def local_data_dir(env: dict[str, str]) -> Path:
    return Path(env.get("DONJUP_LOCAL_DATA_DIR") or DEFAULT_DATA_DIR)


def runs_dir(env: dict[str, str]) -> Path:
    path = local_data_dir(env) / "runs"
    path.mkdir(parents=True, exist_ok=True)
    return path


def append_log(log_path: Path, title: str, text: str) -> None:
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(f"\n\n===== {title} =====\n")
        handle.write(text)
        if text and not text.endswith("\n"):
            handle.write("\n")


def run_command(
    args: list[str],
    env: dict[str, str],
    log_path: Path,
    title: str,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    append_log(log_path, title, f"$ {' '.join(args)}\n# exit={completed.returncode}\n{completed.stdout}")
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


def directory_size_bytes(path: Path) -> int:
    if not path.exists():
        return 0

    total = 0
    for item in path.rglob("*"):
        if item.is_file():
            total += item.stat().st_size
    return total


def latest_backup_summary(data_dir: Path) -> dict[str, Any] | None:
    summaries = sorted((data_dir / "runs").glob("backup-*.json"))
    if not summaries:
        return None
    latest = summaries[-1]
    try:
        payload = json.loads(latest.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"path": str(latest), "error": "invalid json"}
    return {
        "path": str(latest),
        "runId": payload.get("runId"),
        "finishedAt": payload.get("finishedAt"),
        "uploadResult": payload.get("uploadResult"),
    }


def alignment_state(data_dir: Path) -> dict[str, Any]:
    path = data_dir / "alignment-state.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"path": str(path), "exists": False}
    if not isinstance(payload, dict):
        return {"path": str(path), "exists": False, "error": "invalid payload"}
    return {"path": str(path), "exists": True, **payload}


def table_count(snapshot: dict[str, Any] | None, table: str) -> int | None:
    if not snapshot:
        return None
    value = snapshot.get("counts", {}).get(table)
    return value if isinstance(value, int) else None


def parse_nonnegative_int(value: str | None, fallback: int) -> int:
    if value is None:
        return fallback
    if not value.isdigit():
        return fallback
    parsed = int(value)
    return parsed if parsed >= 0 else fallback


def warning_thresholds(env: dict[str, str]) -> dict[str, int]:
    return {
        "localDataWarnBytes": parse_nonnegative_int(
            env.get("DONJUP_LOCAL_DATA_WARN_MB"),
            DEFAULT_LOCAL_DATA_WARN_MB,
        )
        * 1024
        * 1024,
        "coreTransactionRowsWarn": parse_nonnegative_int(
            env.get("DONJUP_CORE_TRANSACTION_ROWS_WARN"),
            DEFAULT_CORE_TRANSACTION_ROWS_WARN,
        ),
        "pageviewRowsWarn": parse_nonnegative_int(
            env.get("DONJUP_PAGEVIEW_ROWS_WARN"),
            DEFAULT_PAGEVIEW_ROWS_WARN,
        ),
        "localDbDeltaWarn": parse_nonnegative_int(
            env.get("DONJUP_LOCAL_DB_DELTA_WARN"),
            DEFAULT_LOCAL_DB_DELTA_WARN,
        ),
    }


def warning_entry(code: str, message: str, current: int, threshold: int) -> dict[str, Any]:
    return {
        "level": "warning",
        "code": code,
        "message": message,
        "current": current,
        "threshold": threshold,
    }


def explain_delta(kind: str, delta: int | None, state: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(delta, int):
        return {"status": "unknown", "unexplainedDelta": delta, "explainedRows": 0, "reason": "delta unavailable"}

    if delta == 0:
        return {"status": "applied", "unexplainedDelta": 0, "explainedRows": 0, "reason": "local and DB counts match"}

    if not isinstance(state, dict) or not state.get("exists"):
        return {"status": "review_required", "unexplainedDelta": delta, "explainedRows": 0, "reason": "alignment state missing"}

    section = state.get(kind, {})
    if not isinstance(section, dict):
        return {"status": "review_required", "unexplainedDelta": delta, "explainedRows": 0, "reason": f"{kind} state missing"}

    if kind == "sale" and delta > 0:
        quarantined = int(section.get("quarantinedRows") or 0)
        collected_only = int(section.get("collectedOnlyRows") or 0)
        explained = max(quarantined, collected_only)
        unexplained = max(0, delta - explained)
        status = "quarantined" if quarantined >= delta else "collected_only" if collected_only >= delta else "review_required"
        return {
            "status": status,
            "unexplainedDelta": unexplained,
            "explainedRows": min(delta, explained),
            "reason": "local-only sale rows are covered by collected-only/quarantine artifacts" if unexplained == 0 else "sale delta exceeds quarantine artifacts",
            "artifact": section.get("quarantineArtifact"),
            "manifest": section.get("quarantineManifest"),
        }

    if kind == "rent" and delta < 0:
        db_first = int(section.get("dbFirstExportedRows") or 0)
        missing_local = abs(delta)
        unexplained = max(0, missing_local - db_first)
        return {
            "status": "db_first_exported" if unexplained == 0 else "review_required",
            "unexplainedDelta": -unexplained if unexplained else 0,
            "explainedRows": min(missing_local, db_first),
            "reason": "DB-only rent rows are covered by DB-first export artifacts" if unexplained == 0 else "rent delta exceeds DB-first export artifacts",
            "artifact": section.get("dbFirstExportArtifact"),
        }

    return {
        "status": "review_required",
        "unexplainedDelta": delta,
        "explainedRows": 0,
        "reason": f"{kind} delta direction is not covered by current artifacts",
    }


def build_alignment(
    local_status: dict[str, Any] | None,
    db_snapshot: dict[str, Any] | None,
    state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if not local_status or not db_snapshot:
        return {}

    sale_local = local_status.get("uniqueSaleRows")
    rent_local = local_status.get("uniqueRentRows")
    sale_db = table_count(db_snapshot, "apt_transactions")
    rent_db = table_count(db_snapshot, "apt_rent_transactions")

    sale_delta = sale_local - sale_db if isinstance(sale_local, int) and sale_db is not None else None
    rent_delta = rent_local - rent_db if isinstance(rent_local, int) and rent_db is not None else None

    return {
        "sale": {
            "localUniqueRows": sale_local,
            "dbRows": sale_db,
            "deltaLocalMinusDb": sale_delta,
            "resolution": explain_delta("sale", sale_delta, state),
        },
        "rent": {
            "localUniqueRows": rent_local,
            "dbRows": rent_db,
            "deltaLocalMinusDb": rent_delta,
            "resolution": explain_delta("rent", rent_delta, state),
        },
    }


def build_warnings(
    *,
    local_size: int,
    db_snapshot: dict[str, Any] | None,
    alignment: dict[str, Any],
    thresholds: dict[str, int],
) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []

    local_limit = thresholds["localDataWarnBytes"]
    if local_limit > 0 and local_size >= local_limit:
        warnings.append(
            warning_entry(
                "local_data_size_high",
                "Local backup data is near the configured free-tier guardrail.",
                local_size,
                local_limit,
            )
        )

    for table_name in ("apt_transactions", "apt_rent_transactions"):
        row_count = table_count(db_snapshot, table_name)
        row_limit = thresholds["coreTransactionRowsWarn"]
        if row_count is not None and row_limit > 0 and row_count >= row_limit:
            warnings.append(
                warning_entry(
                    f"{table_name}_rows_high",
                    f"{table_name} row count is near the configured free-tier guardrail.",
                    row_count,
                    row_limit,
                )
            )

    pageview_count = table_count(db_snapshot, "page_views")
    pageview_limit = thresholds["pageviewRowsWarn"]
    if pageview_count is not None and pageview_limit > 0 and pageview_count >= pageview_limit:
        warnings.append(
            warning_entry(
                "page_views_rows_high",
                "page_views row count is near the configured analytics write guardrail.",
                pageview_count,
                pageview_limit,
            )
        )

    delta_limit = thresholds["localDbDeltaWarn"]
    for kind in ("sale", "rent"):
        resolution = alignment.get(kind, {}).get("resolution", {})
        delta = resolution.get("unexplainedDelta", alignment.get(kind, {}).get("deltaLocalMinusDb"))
        if isinstance(delta, int) and delta_limit > 0 and abs(delta) >= delta_limit:
            warnings.append(
                warning_entry(
                    f"{kind}_local_db_delta_high",
                    f"{kind} local and DB row delta is above the configured guardrail.",
                    abs(delta),
                    delta_limit,
                )
            )

    return warnings


def write_summary(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def format_mb(bytes_value: int) -> str:
    return f"{bytes_value / 1024 / 1024:.1f}MB"


def main() -> int:
    env = child_env()
    run_id = timestamp()
    data_dir = local_data_dir(env)
    logs = runs_dir(env)
    log_path = logs / f"db-health-{run_id}.log"
    summary_path = logs / f"db-health-{run_id}.json"

    print(f"db health run: {run_id}", flush=True)
    print(f"log: {log_path}", flush=True)

    status = run_command(
        ["node", "scripts/local-data-pipeline.mjs", "status"],
        env,
        log_path,
        "local status",
    )
    local_status = last_json_object(status.stdout)

    verify = run_command(
        ["node", "scripts/local-data-pipeline.mjs", "verify-db"],
        env,
        log_path,
        "verify db",
    )
    db_verified = verify.returncode == 0
    verify_result = last_json_object(verify.stdout)

    db_snapshot = None
    if env.get("DATABASE_URL"):
        snapshot = run_command(["node", "-"], env, log_path, "db snapshot", DB_SNAPSHOT_JS)
        db_snapshot = last_json_object(snapshot.stdout)

    local_size = directory_size_bytes(data_dir)
    state = alignment_state(data_dir)
    alignment = build_alignment(local_status, db_snapshot, state)
    thresholds = warning_thresholds(env)
    warnings = build_warnings(
        local_size=local_size,
        db_snapshot=db_snapshot,
        alignment=alignment,
        thresholds=thresholds,
    )
    summary = {
        "runId": run_id,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "logPath": str(log_path),
        "local": {
            "dataDir": str(data_dir),
            "sizeBytes": local_size,
            "status": local_status,
            "latestBackup": latest_backup_summary(data_dir),
            "alignmentState": state,
        },
        "db": {
            "verified": db_verified,
            "verifyResult": verify_result,
            "snapshot": db_snapshot,
        },
        "alignment": alignment,
        "guardrails": {
            "thresholds": thresholds,
            "warnings": warnings,
        },
        "finishedAt": datetime.now(timezone.utc).isoformat(),
    }
    write_summary(summary_path, summary)

    counts = db_snapshot.get("counts", {}) if db_snapshot else {}
    print(
        "db: "
        f"verified={str(db_verified).lower()} "
        f"complexes={counts.get('apt_complexes')} "
        f"sale={counts.get('apt_transactions')} "
        f"rent={counts.get('apt_rent_transactions')}",
        flush=True,
    )
    if local_status:
        print(
            "local: "
            f"size={format_mb(local_size)} "
            f"saleUnique={local_status.get('uniqueSaleRows')} "
            f"rentUnique={local_status.get('uniqueRentRows')}",
            flush=True,
        )
    if alignment:
        print(
            "alignment: "
            f"saleDelta={alignment['sale']['deltaLocalMinusDb']} "
            f"rentDelta={alignment['rent']['deltaLocalMinusDb']}",
            flush=True,
        )
    print(f"warnings: {len(warnings)}", flush=True)
    print(f"summary: {summary_path}", flush=True)
    return 0 if db_verified else 1


if __name__ == "__main__":
    sys.exit(main())
