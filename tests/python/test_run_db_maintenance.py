from __future__ import annotations

import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "run-db-maintenance.py"
SPEC = importlib.util.spec_from_file_location("run_db_maintenance", SCRIPT)
assert SPEC and SPEC.loader
run_db_maintenance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(run_db_maintenance)


def write_file(path: Path, mtime: float) -> None:
    path.write_text("x", encoding="utf-8")
    os.utime(path, (mtime, mtime))


class RunHistoryPruneTest(unittest.TestCase):
    def test_prune_keeps_latest_run_files_per_kind(self) -> None:
        now = datetime(2026, 1, 10, tzinfo=timezone.utc)
        old = now.timestamp() - (40 * 24 * 60 * 60)

        with tempfile.TemporaryDirectory() as temp_dir:
            runs = Path(temp_dir)
            for suffix in (".json", ".log"):
                write_file(runs / f"backup-20260101-000000{suffix}", old)
                write_file(runs / f"backup-20260102-000000{suffix}", old)
                write_file(runs / f"db-health-20260101-000000{suffix}", old)
                write_file(runs / f"maintenance-20260101-000000{suffix}", old)
                write_file(runs / f"timer-audit-20260101-000000{suffix}", old)
                write_file(runs / f"timer-audit-20260102-000000{suffix}", old)
            write_file(runs / "notes.txt", old)

            dry_run = run_db_maintenance.prune_run_history(
                runs,
                max_age_days=30,
                dry_run=True,
                now=now,
            )

            self.assertTrue(dry_run["dryRun"])
            self.assertEqual(dry_run["candidateCount"], 4)
            self.assertEqual(dry_run["deletedCount"], 0)
            self.assertTrue((runs / "backup-20260101-000000.json").exists())

            applied = run_db_maintenance.prune_run_history(
                runs,
                max_age_days=30,
                dry_run=False,
                now=now,
            )

            self.assertFalse(applied["dryRun"])
            self.assertEqual(applied["candidateCount"], 4)
            self.assertEqual(applied["deletedCount"], 4)
            self.assertFalse((runs / "backup-20260101-000000.json").exists())
            self.assertFalse((runs / "backup-20260101-000000.log").exists())
            self.assertFalse((runs / "timer-audit-20260101-000000.json").exists())
            self.assertFalse((runs / "timer-audit-20260101-000000.log").exists())
            self.assertTrue((runs / "backup-20260102-000000.json").exists())
            self.assertTrue((runs / "timer-audit-20260102-000000.json").exists())
            self.assertTrue((runs / "db-health-20260101-000000.json").exists())
            self.assertTrue((runs / "maintenance-20260101-000000.json").exists())
            self.assertTrue((runs / "notes.txt").exists())


class MaintenanceLockTest(unittest.TestCase):
    def test_lock_rejects_parallel_process(self) -> None:
        code = f"""
import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("run_db_maintenance", {str(SCRIPT)!r})
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

handle = module.acquire_maintenance_lock(Path(sys.argv[1]))
if handle is None:
    print("failed", flush=True)
    raise SystemExit(2)

print("locked", flush=True)
sys.stdin.readline()
module.release_maintenance_lock(handle)
"""

        with tempfile.TemporaryDirectory() as temp_dir:
            lock_path = Path(temp_dir) / "maintenance.lock"
            process = subprocess.Popen(
                [sys.executable, "-c", code, str(lock_path)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            try:
                self.assertEqual(process.stdout.readline().strip(), "locked")
                handle = run_db_maintenance.acquire_maintenance_lock(lock_path)
                self.assertIsNone(handle)
            finally:
                if process.stdin:
                    process.stdin.write("\n")
                    process.stdin.flush()
                _, stderr = process.communicate(timeout=5)

            self.assertEqual(process.returncode, 0, stderr)
            self.assertEqual(lock_path.read_text(encoding="utf-8"), "")

            handle = run_db_maintenance.acquire_maintenance_lock(lock_path)
            self.assertIsNotNone(handle)
            if handle:
                run_db_maintenance.release_maintenance_lock(handle)


if __name__ == "__main__":
    unittest.main()
