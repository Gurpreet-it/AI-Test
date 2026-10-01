from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")

# Test a basic search (remove threshold to see all)
results = client.query_points(
    collection_name="jira_test_cases_all",
    query=[0.1]*384,  # dummy vector
    limit=5
)

print(f"Found {len(results.points)} results")
for r in results.points:
    print(f"Score: {r.score}, ID: {r.id}")
    print(f"Payload keys: {r.payload.keys()}")
