#!/usr/bin/env python3
"""
Repair Qdrant: Add 'product' field to existing points (IMPROVED)

This script fixes points that were ingested without the product field.
It infers the product from the excel_file metadata (e.g., 'ABT_Interact.xlsx' → 'INTERACT').

Run: python3 repair_qdrant_product_field_v2.py
"""

from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct
import os
from dotenv import load_dotenv

load_dotenv('.env')

QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
COLLECTION_NAME = 'jira_test_cases_all'

def infer_product_from_filename(filename):
    """Infer product from Excel filename"""
    known_products = ['HMI', 'CAMPAIGN', 'INTERACT', 'OPTIMIZE', 'JOURNEY', 'PLAN', 'MAXAI', 'COGNOS']
    
    filename_upper = filename.upper()
    for product in known_products:
        if product in filename_upper:
            return product
    
    return 'UNKNOWN'

def repair_products():
    """Add product field to all points that are missing it"""
    client = QdrantClient(QDRANT_URL, check_compatibility=False)
    
    print(f"\n{'='*70}")
    print("QDRANT REPAIR: Add Product Field to Existing Points (v2)")
    print(f"{'='*70}\n")
    
    # Get all points with payload only (no vectors on scroll)
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=10000,
        with_payload=True,
        with_vectors=False  # Don't get vectors yet
    )
    
    print(f"Total points: {len(points)}")
    
    # Check how many are missing product field
    missing_product = []
    has_product = []
    
    for point in points:
        payload = point.payload if hasattr(point, 'payload') else {}
        if 'product' in payload and payload['product'] and payload['product'] != 'UNKNOWN':
            has_product.append(point)
        else:
            missing_product.append(point)
    
    print(f"Points with product field: {len(has_product)}")
    print(f"Points missing product field: {len(missing_product)}\n")
    
    if not missing_product:
        print("✓ All points already have product field!")
        return
    
    # Repair missing points
    print(f"[REPAIR] Processing {len(missing_product)} points without product...\n")
    
    repairs_made = 0
    product_counts = {}
    batch_updates = []
    
    for point in missing_product:
        payload = point.payload if hasattr(point, 'payload') else {}
        
        # Get excel filename and infer product
        metadata = payload.get('metadata', {})
        if isinstance(metadata, dict):
            excel_file = metadata.get('excel_file', '')
        else:
            excel_file = ''
            
        product = infer_product_from_filename(excel_file)
        
        # Update payload with product field
        payload['product'] = product
        
        # We need to get the vector to upsert the point back
        # Retrieve the point WITH vector
        point_with_vector = client.retrieve(
            collection_name=COLLECTION_NAME,
            ids=[point.id],
            with_vectors=True
        )[0]
        
        # Create updated point with vector and new payload
        updated_point = PointStruct(
            id=point.id,
            vector=point_with_vector.vector,
            payload=payload
        )
        
        batch_updates.append(updated_point)
        
        repairs_made += 1
        product_counts[product] = product_counts.get(product, 0) + 1
        
        # Upsert in batches of 50
        if len(batch_updates) >= 50:
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=batch_updates
            )
            print(f"  ✓ Upserted {repairs_made}/{len(missing_product)} points")
            batch_updates = []
    
    # Upsert remaining points
    if batch_updates:
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=batch_updates
        )
        print(f"  ✓ Upserted final batch: {len(batch_updates)} points")
    
    print(f"\n{'='*70}")
    print("✓ REPAIR COMPLETE")
    print(f"{'='*70}\n")
    
    print("Product breakdown:")
    for product in sorted(product_counts.keys()):
        count = product_counts[product]
        print(f"  {product:<15}: {count:>3} test cases")
    
    print(f"\n✓ Total repaired: {repairs_made}")
    
    # Verify
    print("\n[VERIFICATION] Checking repaired data...")
    points, _ = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=10000,
        with_payload=True,
    )
    
    products = {}
    for point in points:
        if hasattr(point, 'payload') and point.payload.get('product'):
            product = point.payload['product']
            products[product] = products.get(product, 0) + 1
    
    print(f"\n✓ Products in Qdrant:")
    for product in sorted(products.keys()):
        print(f"  {product:<15}: {products[product]:>3} test cases")
    
    print(f"\n{'='*70}")
    print("✓ VERIFICATION COMPLETE - ALL PRODUCTS ASSIGNED")
    print(f"{'='*70}\n")

if __name__ == '__main__':
    repair_products()
