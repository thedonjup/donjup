#!/usr/bin/env python3
"""Install or remove the DonJup DB maintenance systemd user timer."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SYSTEMD_DIR = Path.home() / ".config" / "systemd" / "user"
TEMPLATE_DIR = ROOT / "ops" / "systemd"
SERVICE_NAME = "donjup-db-maintenance.service"
TIMER_NAME = "donjup-db-maintenance.timer"
AUDIT_SERVICE_NAME = "donjup-db-maintenance-audit.service"
AUDIT_TIMER_NAME = "donjup-db-maintenance-audit.timer"
UNIT_NAMES = (SERVICE_NAME, TIMER_NAME, AUDIT_SERVICE_NAME, AUDIT_TIMER_NAME)
TIMER_NAMES = (TIMER_NAME, AUDIT_TIMER_NAME)
DEFAULT_SYSTEMD_PATHS = [
    "/usr/local/sbin",
    "/usr/local/bin",
    "/usr/sbin",
    "/usr/bin",
    "/sbin",
    "/bin",
    "/snap/bin",
]


def require_pnpm() -> str:
    pnpm = shutil.which("pnpm")
    if not pnpm:
        raise RuntimeError("pnpm not found in PATH")
    return pnpm


def systemd_path(value: str, pnpm: str) -> str:
    entries = [
        str(Path(pnpm).parent),
        str(Path.home() / ".local" / "bin"),
        str(Path.home() / "bin"),
    ]
    for item in value.split(os.pathsep):
        if not item.startswith("/") or "\n" in item or "\r" in item:
            continue
        if "/.codex/" in item or "/.vscode/extensions/" in item:
            continue
        entries.append(item)
    entries.extend(DEFAULT_SYSTEMD_PATHS)
    return os.pathsep.join(dict.fromkeys(entries))


def template_context() -> dict[str, str]:
    pnpm = require_pnpm()
    return {
        "WORKDIR": str(ROOT),
        "PNPM": pnpm,
        "PATH": systemd_path(os.environ.get("PATH", ""), pnpm),
        "DOC_PATH": str(ROOT / "docs" / "database-free-tier-plan.md"),
    }


def render_template(path: Path, context: dict[str, str]) -> str:
    text = path.read_text(encoding="utf-8")
    for key, value in context.items():
        text = text.replace(f"{{{{{key}}}}}", value)
    return text


def unit_templates(context: dict[str, str]) -> dict[str, str]:
    return {
        name: render_template(TEMPLATE_DIR / f"{name}.template", context)
        for name in UNIT_NAMES
    }


def run_systemctl(args: list[str], dry_run: bool) -> None:
    command = ["systemctl", "--user", *args]
    if dry_run:
        print("$ " + " ".join(command))
        return
    subprocess.run(command, check=True)


def install_units(enable: bool, dry_run: bool) -> None:
    context = template_context()
    units = unit_templates(context)

    if dry_run:
        print(f"install dir: {SYSTEMD_DIR}")
    else:
        SYSTEMD_DIR.mkdir(parents=True, exist_ok=True)

    for name, content in units.items():
        target = SYSTEMD_DIR / name
        if dry_run:
            print(f"write: {target}")
            print(content.rstrip())
            continue
        target.write_text(content, encoding="utf-8")

    run_systemctl(["daemon-reload"], dry_run)
    if enable:
        run_systemctl(["enable", "--now", *TIMER_NAMES], dry_run)
    else:
        print(
            "installed. Enable with: "
            f"systemctl --user enable --now {' '.join(TIMER_NAMES)}"
        )


def uninstall_units(dry_run: bool) -> None:
    run_systemctl(["disable", "--now", *TIMER_NAMES], dry_run)
    for name in reversed(UNIT_NAMES):
        target = SYSTEMD_DIR / name
        if dry_run:
            print(f"remove: {target}")
            continue
        try:
            target.unlink()
        except FileNotFoundError:
            pass
    run_systemctl(["daemon-reload"], dry_run)


def main() -> int:
    parser = argparse.ArgumentParser(description="Install DonJup DB maintenance systemd user timer.")
    parser.add_argument("--dry-run", action="store_true", help="print planned actions only")
    parser.add_argument("--enable", action="store_true", help="enable and start the timer after install")
    parser.add_argument("--uninstall", action="store_true", help="remove the installed timer and service")
    args = parser.parse_args()

    try:
        if args.uninstall:
            uninstall_units(args.dry_run)
        else:
            install_units(args.enable, args.dry_run)
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
