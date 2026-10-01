from fastapi import FastAPI
from qdrant_client import QdrantClient
from pydantic import BaseModel
from typing import List

app = FastAPI()

client = QdrantClient(url="http://localhost:6333")

class SearchRequest(BaseModel):
    vector: List[float]
    limit: int = 5
    score_threshold: float = 0.40

@app.post("/search")
async def search(req: SearchRequest):
    results = client.query_points(
        collection_name="jira_test_cases_all",
        query=req.vector,
        limit=req.limit,
        score_threshold=req.score_threshold,
        with_payload=True
    )
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
