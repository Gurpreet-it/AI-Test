from qdrant_client import QdrantClient

client = QdrantClient("http://localhost:6333", check_compatibility=False)

print("=" * 60)
print("QDRANT COLLECTIONS - DETAILED INSPECTION")
print("=" * 60)

collections = client.get_collections()

for collection in collections.collections:
    col_info = client.get_collection(collection.name)
    print(f"\n📦 Collection: {collection.name}")
    print(f"   Points (vectors): {col_info.points_count}")
    
    # Try both possible attribute names
    try:
        vec_dim = col_info.config.vector_size
    except AttributeError:
        try:
            vec_dim = col_info.config.vectors.size
        except:
            vec_dim = "unknown"
    
    print(f"   Vector dimension: {vec_dim}")
    print(f"   Distance metric: {col_info.config.distance}")
    
    if col_info.points_count > 0:
        points, _ = client.scroll(collection.name, limit=3)
        print(f"\n   Sample data ({min(len(points), 3)} of {col_info.points_count} points):")
        print("   " + "-" * 56)
        
        for i, point in enumerate(points, 1):
            print(f"\n   Point {i} (ID: {point.id}):")
            if point.payload:
                for key, value in point.payload.items():
                    if isinstance(value, str) and len(value) > 50:
                        print(f"      {key}: {value[:50]}...")
                    else:
                        print(f"      {key}: {value}")
            else:
                print("      (no metadata/payload)")
    else:
        print("   ⚠️  Collection is EMPTY (no vectors)")

print("\n" + "=" * 60)
