from __future__ import annotations

import fcntl
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_STALE_AFTER_SECONDS = 2 * 60 * 60


class LockBusyError(RuntimeError):
    def __init__(self, path: Path, metadata: dict[str, Any] | None):
        self.path = path
        self.metadata = metadata or {}
        super().__init__(f"lock busy: {path}")


def pid_is_alive(pid: int | None) -> bool:
    if not pid or pid < 1:
        return False
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def read_lock_metadata(path: Path) -> dict[str, Any] | None:
    try:
        raw = path.read_text(encoding="utf-8").strip()
    except OSError:
        return None
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"raw": raw}


def lock_age_seconds(path: Path) -> float | None:
    try:
        return max(0.0, datetime.now(timezone.utc).timestamp() - path.stat().st_mtime)
    except OSError:
        return None


def acquire_flock(
    path: Path,
    *,
    stale_after_seconds: int = DEFAULT_STALE_AFTER_SECONDS,
    purpose: str,
) -> Any:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = path.open("a+", encoding="utf-8")
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        metadata = read_lock_metadata(path) or {}
        pid = metadata.get("pid")
        metadata["pidAlive"] = pid_is_alive(pid if isinstance(pid, int) else None)
        metadata["ageSeconds"] = lock_age_seconds(path)
        metadata["staleAfterSeconds"] = stale_after_seconds
        handle.close()
        raise LockBusyError(path, metadata) from error

    metadata = read_lock_metadata(path) or {}
    pid = metadata.get("pid")
    age = lock_age_seconds(path)
    stalePreviousMetadata = (
      age is not None
      and age > stale_after_seconds
      and not pid_is_alive(pid if isinstance(pid, int) else None)
    )
    handle.seek(0)
    handle.truncate()
    handle.write(json.dumps({
        "pid": os.getpid(),
        "purpose": purpose,
        "startedAt": datetime.now(timezone.utc).isoformat(),
        "stalePreviousMetadata": stalePreviousMetadata,
    }, ensure_ascii=False))
    handle.write("\n")
    handle.flush()
    return handle


def release_flock(handle: Any) -> None:
    handle.seek(0)
    handle.truncate()
    handle.flush()
    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    handle.close()
