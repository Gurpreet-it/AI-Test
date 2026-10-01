#!/usr/bin/env python3
"""
glossary.py - Feature synonym handling for the RAG (e.g. A/B = ABT = AB testing).

Used by:
  * ingest_from_excel.py     -> tags each test case (payload["features"]) and appends
                                "Feature: A/B Testing (also known as ...)" to the embedded text
  * tag_existing_points.py   -> backfills payload["features"] on points already in Qdrant
  * webapp/rag_core.py       -> expands search queries with the same aliases; feature filter

Check the glossary after editing:
  python3 glossary.py --check
  python3 glossary.py "Verify ABT branch sampling"      # shows detection + expanded query
"""

from __future__ import annotations

import json
import re
import sys
from functools import lru_cache
from pathlib import Path

GLOSSARY_PATH = Path(__file__).resolve().with_name("glossary.json")

# No letter/digit immediately before/after a match. Underscore, space, '/', '-' count as boundaries,
# so "TC_DT_ABTesting_DDL" and "ABT_034" match, while "ABTRACT" / "LAB test" do not.
_PRE, _POST = r"(?<![A-Za-z0-9])", r"(?![A-Za-z0-9])"


class GlossaryError(ValueError):
    pass


@lru_cache(maxsize=1)
def load() -> dict:
    """Load + validate glossary.json once. Returns {id: {label, aliases, regex}}."""
    if not GLOSSARY_PATH.exists():
        return {}
    try:
        raw = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise GlossaryError(f"glossary.json is not valid JSON: {e}") from e
    out = {}
    for fid, g in (raw.get("features") or {}).items():
        if not re.fullmatch(r"[A-Z][A-Z0-9_]*", fid):
            raise GlossaryError(f"Feature id {fid!r} must be UPPER_SNAKE_CASE")
        label, aliases, patterns = g.get("label"), g.get("aliases") or [], g.get("patterns") or []
        if not label or not isinstance(aliases, list):
            raise GlossaryError(f"{fid}: 'label' and 'aliases' (list) are required")
        if not patterns:  # fall back to literal aliases with flexible whitespace
            patterns = [r"\s*".join(map(re.escape, a.split())) for a in aliases]
        try:
            rx = re.compile(_PRE + "(?:" + "|".join(patterns) + ")" + _POST, re.IGNORECASE)
        except re.error as e:
            raise GlossaryError(f"{fid}: invalid regex in patterns: {e}") from e
        prods = [str(p).upper() for p in (g.get("products") or [])]
        out[fid] = {"label": label, "aliases": aliases, "regex": rx, "products": prods,
                    "examples_match": g.get("examples_match", []),
                    "examples_no_match": g.get("examples_no_match", [])}
    return out


@lru_cache(maxsize=1)
def load_intents() -> dict:
    """query_intents from glossary.json: {id: {label, regex, search_as, guidance, examples...}}."""
    if not GLOSSARY_PATH.exists():
        return {}
    raw = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    out = {}
    for iid, it in (raw.get("query_intents") or {}).items():
        pats = it.get("patterns") or []
        if not pats or not it.get("search_as") or not it.get("guidance"):
            raise GlossaryError(f"intent {iid}: 'patterns', 'search_as' and 'guidance' are required")
        try:
            rx = re.compile(_PRE + "(?:" + "|".join(pats) + ")" + _POST, re.IGNORECASE)
        except re.error as e:
            raise GlossaryError(f"intent {iid}: invalid regex: {e}") from e
        out[iid] = {"label": it.get("label", iid), "regex": rx, "search_as": it["search_as"],
                    "guidance": it["guidance"], "label_tag": it.get("label_tag"),
                    "examples_match": it.get("examples_match", []),
                    "examples_no_match": it.get("examples_no_match", [])}
    return out


def detect_intents(query: str) -> list[str]:
    return [iid for iid, it in load_intents().items() if it["regex"].search(query or "")]


def rewrite_for_search(query: str) -> tuple[str, list[str]]:
    """Replace QA-intent phrases (e.g. 'negative test scenarios') with their search wording so the
    embedding isn't pulled toward product terms that share a word ('Negative Event')."""
    ids = detect_intents(query)
    for iid in ids:
        it = load_intents()[iid]
        query = it["regex"].sub(it["search_as"], query)
    return query, ids


def intent_guidance(ids: list[str]) -> str:
    its = load_intents()
    return "\n".join(f"- {its[i]['guidance']}" for i in ids if i in its)


def label_tags(labels: str) -> list[str]:
    """Zephyr 'Labels' cell -> normalised tags: 'UI, Negative;_Boundary' -> ['UI', 'NEGATIVE', 'BOUNDARY']."""
    tags = []
    for t in re.split(r"[,;/|]+", labels or ""):
        t = re.sub(r"[^A-Za-z0-9]+", "_", t).strip("_").upper()
        # full tag + its words, so 'Negative_Scenario' is also findable as 'NEGATIVE'
        for x in [t] + [w for w in t.split("_") if len(w) >= 3]:
            if x and x not in tags:
                tags.append(x)
    return tags


def detect_features(text: str, product: str | None = None) -> list[str]:
    """Feature ids found in text, in glossary order (deterministic).
    Product-scoped entries (e.g. EP = Event Pattern only in INTERACT) are skipped when a different
    product is given; with product=None (e.g. a chat query across all products) they are included."""
    if not text:
        return []
    p = (product or "").upper()
    return [fid for fid, g in load().items()
            if (not g["products"] or not p or p in g["products"]) and g["regex"].search(str(text))]


def feature_line(feature_ids: list[str]) -> str:
    """Text appended to embeddings / queries so the vector carries every alias."""
    g = load()
    parts = [f"{g[f]['label']} (also known as: {', '.join(g[f]['aliases'])})" for f in feature_ids if f in g]
    return ("Feature: " + "; ".join(parts)) if parts else ""


def expand_query(query: str, product: str | None = None) -> tuple[str, list[str]]:
    """Return (query + feature line, detected ids). Unchanged if nothing detected."""
    feats = detect_features(query, product)
    line = feature_line(feats)
    return (f"{query}\n{line}" if line else query), feats


def list_features() -> list[dict]:
    return [{"id": fid, "label": g["label"], "aliases": g["aliases"]} for fid, g in load().items()]


def self_check() -> list[str]:
    """Run each entry's examples; returns a list of failures (empty = OK)."""
    fails = []
    for iid, it in load_intents().items():
        for ex in it["examples_match"]:
            if not it["regex"].search(ex):
                fails.append(f"intent {iid}: should match {ex!r}")
        for ex in it["examples_no_match"]:
            m = it["regex"].search(ex)
            if m:
                fails.append(f"intent {iid}: should NOT match {ex!r} (matched {m.group(0)!r})")
    for fid, g in load().items():
        for a in g["aliases"]:
            if not g["regex"].search(a):
                fails.append(f"{fid}: alias {a!r} is not matched by its own patterns")
        for ex in g["examples_match"]:
            if not g["regex"].search(ex):
                fails.append(f"{fid}: should match {ex!r}")
        for ex in g["examples_no_match"]:
            m = g["regex"].search(ex)
            if m:
                fails.append(f"{fid}: should NOT match {ex!r} (matched {m.group(0)!r})")
    return fails


if __name__ == "__main__":
    try:
        feats = load()
    except GlossaryError as e:
        print(f"✗ {e}")
        sys.exit(1)
    if len(sys.argv) > 1 and sys.argv[1] != "--check":
        q = " ".join(sys.argv[1:])
        rq, iids = rewrite_for_search(q)
        eq, ids = expand_query(rq)
        print(f"Intents: {iids or 'none'} | Features: {ids or 'none'}\nSearch query:\n{eq}")
        sys.exit(0)
    problems = self_check()
    print(f"Loaded {len(feats)} feature(s): {', '.join(feats) or '-'}")
    for p in problems:
        print(f"  ✗ {p}")
    print("✓ glossary OK" if not problems else f"✗ {len(problems)} problem(s)")
    sys.exit(1 if problems else 0)
