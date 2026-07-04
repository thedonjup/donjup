from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "check-db-health.py"
SPEC = importlib.util.spec_from_file_location("check_db_health", SCRIPT)
assert SPEC and SPEC.loader
check_db_health = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(check_db_health)


class DbHealthWarningsTest(unittest.TestCase):
    def test_build_warnings_uses_configured_guardrails(self) -> None:
        warnings = check_db_health.build_warnings(
            local_size=2_048,
            db_snapshot={
                "counts": {
                    "apt_transactions": 11,
                    "apt_rent_transactions": 3,
                    "page_views": 7,
                }
            },
            alignment={
                "sale": {"deltaLocalMinusDb": 0},
                "rent": {"deltaLocalMinusDb": 5},
            },
            thresholds={
                "localDataWarnBytes": 1_024,
                "coreTransactionRowsWarn": 10,
                "pageviewRowsWarn": 5,
                "localDbDeltaWarn": 4,
            },
        )

        self.assertEqual(
            [warning["code"] for warning in warnings],
            [
                "local_data_size_high",
                "apt_transactions_rows_high",
                "page_views_rows_high",
                "rent_local_db_delta_high",
            ],
        )

    def test_zero_thresholds_disable_warnings(self) -> None:
        warnings = check_db_health.build_warnings(
            local_size=2_048,
            db_snapshot={
                "counts": {
                    "apt_transactions": 11,
                    "apt_rent_transactions": 12,
                    "page_views": 7,
                }
            },
            alignment={
                "sale": {"deltaLocalMinusDb": 3},
                "rent": {"deltaLocalMinusDb": 5},
            },
            thresholds={
                "localDataWarnBytes": 0,
                "coreTransactionRowsWarn": 0,
                "pageviewRowsWarn": 0,
                "localDbDeltaWarn": 0,
            },
        )

        self.assertEqual(warnings, [])

    def test_build_alignment_marks_artifact_explained_deltas(self) -> None:
        alignment = check_db_health.build_alignment(
            {"uniqueSaleRows": 130, "uniqueRentRows": 80},
            {"counts": {"apt_transactions": 100, "apt_rent_transactions": 100}},
            {
                "exists": True,
                "sale": {"quarantinedRows": 30},
                "rent": {"dbFirstExportedRows": 20},
            },
        )

        self.assertEqual(alignment["sale"]["resolution"]["status"], "quarantined")
        self.assertEqual(alignment["sale"]["resolution"]["unexplainedDelta"], 0)
        self.assertEqual(alignment["rent"]["resolution"]["status"], "db_first_exported")
        self.assertEqual(alignment["rent"]["resolution"]["unexplainedDelta"], 0)

        warnings = check_db_health.build_warnings(
            local_size=0,
            db_snapshot={"counts": {}},
            alignment=alignment,
            thresholds={
                "localDataWarnBytes": 0,
                "coreTransactionRowsWarn": 0,
                "pageviewRowsWarn": 0,
                "localDbDeltaWarn": 1,
            },
        )

        self.assertEqual(warnings, [])

    def test_warning_thresholds_read_environment_values(self) -> None:
        thresholds = check_db_health.warning_thresholds(
            {
                "DONJUP_LOCAL_DATA_WARN_MB": "2",
                "DONJUP_CORE_TRANSACTION_ROWS_WARN": "30",
                "DONJUP_PAGEVIEW_ROWS_WARN": "40",
                "DONJUP_LOCAL_DB_DELTA_WARN": "50",
            }
        )

        self.assertEqual(thresholds["localDataWarnBytes"], 2 * 1024 * 1024)
        self.assertEqual(thresholds["coreTransactionRowsWarn"], 30)
        self.assertEqual(thresholds["pageviewRowsWarn"], 40)
        self.assertEqual(thresholds["localDbDeltaWarn"], 50)


if __name__ == "__main__":
    unittest.main()
