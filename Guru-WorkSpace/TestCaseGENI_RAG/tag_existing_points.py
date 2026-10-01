#!/usr/bin/env python3
"""
tag_existing_points.py - Backfill payload["features"] (from glossary.json) on points
that are ALREADY in Qdrant, without re-embedding.

  python3 tag_existing_points.py                 # DRY RUN (default): shows what would change
  python3 tag_existing_points.py --apply         # writes payload["features"]
  python3 tag_existing_points.py --product INTERACT --apply

What it does NOT do: change vectors. Similarity search only "knows" the aliases after a
re-ingest (ingest_from_excel.py adds the alias line to the embedded text). Until then the web
app's query expansion + the Feature filter still work using these tags.
"""

import argparse
import os
import sys
from collections import Counter, defaultdict

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchValue

import glossary

load_dotenv(".env")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "jira_test_cases_all")
PAGE = 256


def text_of(payload: dict) -> str:
    md = payload.get("metadata") or {}
    return " ".join(str(x) for x in (
        payload.get("summary", ""), md.get("folder", ""), md.get("component", ""), md.get("objective", ""),
        md.get("precondition", ""), md.get("steps", ""), md.get("expected_result", "")))


def main(client=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write changes (default is dry run)")
    ap.add_argument("--product", help="only this product (e.g. INTERACT)")
    args = ap.parse_args()

    try:
        glossary.load()
    except glossary.GlossaryError as e:
        sys.exit(f"✗ {e}")
    problems = glossary.self_check()
    if problems:
        sys.exit("✗ glossary.json self-check failed:\n  " + "\n  ".join(problems))

    q = client or QdrantClient(QDRANT_URL, api_key=os.getenv("QDRANT_API_KEY") or None,
                               check_compatibility=False, timeout=30)
    flt = Filter(must=[FieldCondition(key="product", match=MatchValue(value=args.product.upper()))]) \
        if args.product else None

    scanned, unchanged, untagged = 0, 0, 0
    to_set = defaultdict(list)   # tuple(features) -> [point ids]
    per_feature = Counter()
    samples = []
    offset = None
    while True:  # paginated scroll - no unbounded reads
        pts, offset = q.scroll(COLLECTION, scroll_filter=flt, limit=PAGE, offset=offset,
                               with_payload=True, with_vectors=False)
        for p in pts:
            scanned += 1
            pl = p.payload or {}
            feats = glossary.detect_features(text_of(pl), pl.get("product"))
            per_feature.update(feats)
            untagged += not feats
            if sorted(pl.get("features") or []) == sorted(feats) and "features" in pl:
                unchanged += 1
                continue
            to_set[tuple(feats)].append(p.id)
            if len(samples) < 8:
                samples.append(f"{pl.get('key', p.id)} | {str(pl.get('summary', ''))[:50]} -> {feats}")
        if offset is None:
            break

    changes = sum(len(v) for v in to_set.values())
    print(f"Scanned {scanned} point(s) in '{COLLECTION}'" + (f" (product={args.product.upper()})" if args.product else ""))
    for fid, n in per_feature.most_common():
        print(f"  {fid:<14} detected in {n} point(s)")
    print(f"  no feature detected: {untagged}")
    print(f"  already up to date: {unchanged} | to update: {changes}")
    for s in samples:
        print(f"    e.g. {s}")

    if not args.apply:
        print("\nDRY RUN - nothing written. Re-run with --apply to write payload['features'].")
        return
    for feats, ids in to_set.items():
        for i in range(0, len(ids), PAGE):
            q.set_payload(COLLECTION, payload={"features": list(feats)}, points=ids[i:i + PAGE])
    try:
        q.create_payload_index(COLLECTION, field_name="features", field_schema="keyword")
    except Exception as e:  # noqa: BLE001
        if "already exists" not in str(e).lower():
            print(f"⚠ could not create 'features' index: {str(e)[:100]}")
    print(f"\n✓ Updated {changes} point(s).")


if __name__ == "__main__":
    main()
