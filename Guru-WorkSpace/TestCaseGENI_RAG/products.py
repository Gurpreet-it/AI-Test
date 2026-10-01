#!/usr/bin/env python3
"""
products.py - Single source of truth for the product list: config.json -> "products".

Used by ingest_from_excel.py (product detection from folder / filename) and the web app
(sidebar counts, product filter, chat prompt).

To add a product : add an entry under "products" in config.json, then
                   python3 products.py --create-folders
To remove one    : delete its entry from config.json (existing Qdrant points keep their tag
                   until you re-ingest with --clear).

  python3 products.py                    # list products + folder status
  python3 products.py --create-folders   # create missing inbox/processed/archive/log folders
"""

from __future__ import annotations

import json
import re
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config.json"
PRODUCT_ID_RE = re.compile(r"^[A-Z][A-Z0-9_]{0,29}$")


class ProductConfigError(ValueError):
    pass


@lru_cache(maxsize=1)
def load_products() -> dict:
    """{ID: {name, description, project_key, ...}} in config.json order. IDs are validated."""
    if not CONFIG_PATH.exists():
        raise ProductConfigError(f"{CONFIG_PATH.name} not found - it defines the product list")
    try:
        cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ProductConfigError(f"{CONFIG_PATH.name} is not valid JSON: {e}") from e
    prods = cfg.get("products") or {}
    if not prods:
        raise ProductConfigError(f"{CONFIG_PATH.name} has no 'products'")
    for pid in prods:
        if not PRODUCT_ID_RE.match(pid):
            raise ProductConfigError(
                f"Product id {pid!r} must be UPPER_CASE letters/digits/underscore (it is also the folder name)")
    return prods


def product_ids() -> list[str]:
    return list(load_products().keys())


def product_names() -> dict[str, str]:
    return {pid: (p.get("name") or pid) for pid, p in load_products().items()}


def product_from_path(file_path) -> str | None:
    """Folder name match first (exact, e.g. test_cases_inbox/AC/current/x.xlsx -> AC).
    Filename fallback matches WHOLE tokens only, so 'abt_interact.xlsx' is INTERACT and never
    'AC' (the old substring check would match 'ac' inside 'interact')."""
    ids = product_ids()
    path = Path(file_path)
    for part in path.parts:
        if part in ids:
            return part
    tokens = {t.upper() for t in re.split(r"[^A-Za-z0-9]+", path.stem) if t}
    matches = [pid for pid in ids if pid in tokens]
    return matches[0] if len(matches) == 1 else None  # ambiguous -> None (caller decides)


def folders_for(pid: str) -> list[Path]:
    return [ROOT / "test_cases_inbox" / pid / "current", ROOT / "test_cases_inbox" / pid / "archive",
            ROOT / "test_cases_processed" / pid, ROOT / "test_cases_archive" / pid, ROOT / "ingestion_logs" / pid]


if __name__ == "__main__":
    try:
        prods = load_products()
    except ProductConfigError as e:
        sys.exit(f"✗ {e}")
    create = "--create-folders" in sys.argv
    for pid, p in prods.items():
        missing = [f for f in folders_for(pid) if not f.exists()]
        if create:
            for f in missing:
                f.mkdir(parents=True, exist_ok=True)
        state = "ok" if not missing else ("created" if create else f"{len(missing)} folder(s) missing")
        print(f"  {pid:<10} {p.get('name', ''):<32} folders: {state}")
    if not create and any(not f.exists() for pid in prods for f in folders_for(pid)):
        print("\nRun: python3 products.py --create-folders")
