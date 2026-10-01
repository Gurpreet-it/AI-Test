#!/usr/bin/env python3
"""
Diagnose Qdrant payload structure and RAG similarity scores
Run this locally where Qdrant is running to see what fields actually exist
"""

import os
import sys
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
import json

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")

embedder = SentenceTransformer('all-MiniLM-L6-v2')
qdrant = QdrantClient(url=QDRANT_URL, prefer_grpc=False, timeout=10.0, check_compatibility=False)

def diagnose():
    """Diagnose Qdrant payload structure."""
    
    print("=" * 80)
    print("QDRANT PAYLOAD STRUCTURE DIAGNOSIS")
    print("=" * 80)
    
    # Query for A/B testing cases
    query_text = "A/B testing multi-armed bandit"
    query_vector = embedder.encode(query_text).tolist()
    
    try:
        results = qdrant.query_points(
            collection_name='jira_test_cases_all',
            query=query_vector,
            limit=3
        )
        
        print(f"\n✅ Found {len(results.points)} results for '{query_text}'")
        print("\n" + "=" * 80)
        print("TOP 3 RESULTS - PAYLOAD STRUCTURE")
        print("=" * 80)
        
        for i, point in enumerate(results.points, 1):
            print(f"\n📌 Result {i} (Point ID: {point.id})")
            print(f"   Similarity Score: {point.score:.4f}")
            
            if point.payload:
                print(f"   Payload fields: {list(point.payload.keys())}")
                print(f"   Payload content:")
                for key, value in sorted(point.payload.items()):
                    if isinstance(value, str) and len(value) > 100:
                        print(f"     • {key}: {value[:100]}...")
                    else:
                        print(f"     • {key}: {value}")
            else:
                print(f"   ❌ Payload is EMPTY")
        
        print("\n" + "=" * 80)
        print("ANALYSIS & RECOMMENDATIONS")
        print("=" * 80)
        
        if results.points and results.points[0].payload:
            actual_fields = set(results.points[0].payload.keys())
            min_score = min(p.score for p in results.points)
            max_score = max(p.score for p in results.points)
            
            print(f"\n✓ Similarity Score Range: {min_score:.3f} - {max_score:.3f}")
            print(f"✓ Actual payload fields: {sorted(actual_fields)}")
            
            # Check for expected fields
            expected = {'title', 'test_type', 'severity', 'objective', 'description'}
            missing = expected - actual_fields
            
            if missing:
                print(f"\n❌ Missing expected fields: {sorted(missing)}")
                print(f"\n🔧 FIX:")
                print(f"   1. Update RAG threshold from 0.65 to 0.50 (current scores are {min_score:.3f}-{max_score:.3f})")
                print(f"   2. Update payload field names in the agent to match: {sorted(actual_fields)}")
            else:
                print(f"\n✅ All expected fields present!")
                print(f"🔧 FIX: Just lower RAG threshold from 0.65 to 0.50")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    diagnose()
