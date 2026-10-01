#!/usr/bin/env python3
"""
FastAPI Embedding Service for n8n Integration
Wraps sentence-transformers all-MiniLM-L6-v2 with REST API

Start server:
  python3 embedding_service.py

Then access:
  http://localhost:8000/docs (Swagger UI)
  http://localhost:8000/health (health check)
  POST http://localhost:8000/embed (single embedding)
  POST http://localhost:8000/embed-batch (batch embeddings)
"""

import os
import sys
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from sentence_transformers import SentenceTransformer
import numpy as np
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Embedding Service",
    description="sentence-transformers all-MiniLM-L6-v2 REST API for n8n",
    version="1.0.0"
)

# Global embedder (loaded once at startup)
embedder = None

# =============================================================================
# Request/Response Models
# =============================================================================

class EmbedRequest(BaseModel):
    """Single text embedding request"""
    text: str
    
    class Config:
        example = {
            "text": "Test case: Verify A/B testing multi-armed bandit option"
        }


class EmbedBatchRequest(BaseModel):
    """Batch text embedding request"""
    texts: List[str]
    
    class Config:
        example = {
            "texts": [
                "Test case 1: Verify A/B testing",
                "Test case 2: Validate sampling percentage",
                "Test case 3: Check branch selection"
            ]
        }


class EmbedResponse(BaseModel):
    """Single embedding response"""
    text: str
    embedding: List[float]
    dimension: int
    model: str
    timestamp: str
    
    class Config:
        example = {
            "text": "Test case: Verify A/B testing",
            "embedding": [0.123, 0.456, 0.789],  # truncated for example
            "dimension": 384,
            "model": "all-MiniLM-L6-v2",
            "timestamp": "2026-09-21T10:30:00Z"
        }


class EmbedBatchResponse(BaseModel):
    """Batch embedding response"""
    embeddings: List[Dict]
    count: int
    model: str
    timestamp: str
    
    class Config:
        example = {
            "embeddings": [
                {
                    "text": "Test case 1",
                    "embedding": [0.123, 0.456, ...],
                    "dimension": 384
                },
                {
                    "text": "Test case 2",
                    "embedding": [0.987, 0.654, ...],
                    "dimension": 384
                }
            ],
            "count": 2,
            "model": "all-MiniLM-L6-v2",
            "timestamp": "2026-09-21T10:30:00Z"
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model: str
    dimension: int
    timestamp: str


# =============================================================================
# Startup/Shutdown Events
# =============================================================================

@app.on_event("startup")
async def startup_event():
    """Load embedder model on startup"""
    global embedder
    
    logger.info("🚀 Starting Embedding Service...")
    logger.info("📦 Loading sentence-transformers model: all-MiniLM-L6-v2")
    
    try:
        embedder = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("✅ Model loaded successfully")
        logger.info(f"   - Dimensions: 384")
        logger.info(f"   - Model type: Sentence Transformer")
        logger.info("✅ Service ready to accept requests")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        sys.exit(1)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global embedder
    if embedder:
        logger.info("🛑 Shutting down Embedding Service...")
        embedder = None


# =============================================================================
# Health Check Endpoint
# =============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for n8n monitoring"""
    if embedder is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return HealthResponse(
        status="healthy",
        model="all-MiniLM-L6-v2",
        dimension=384,
        timestamp=datetime.utcnow().isoformat() + "Z"
    )


# =============================================================================
# Single Embedding Endpoint
# =============================================================================

@app.post("/embed", response_model=EmbedResponse)
async def embed_single(request: EmbedRequest):
    """
    Generate embedding for a single text.
    
    Perfect for n8n single-node processing.
    
    Example n8n call:
    ```
    POST http://localhost:8000/embed
    
    {
      "text": "Test case title and description..."
    }
    ```
    """
    
    if embedder is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        # Generate embedding
        embedding = embedder.encode(request.text).tolist()
        
        logger.info(f"✅ Embedded text ({len(request.text)} chars) → 384-d vector")
        
        return EmbedResponse(
            text=request.text,
            embedding=embedding,
            dimension=384,
            model="all-MiniLM-L6-v2",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    except Exception as e:
        logger.error(f"❌ Embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Batch Embedding Endpoint
# =============================================================================

@app.post("/embed-batch", response_model=EmbedBatchResponse)
async def embed_batch(request: EmbedBatchRequest):
    """
    Generate embeddings for multiple texts (batch processing).
    
    More efficient than single requests for 2+ texts.
    
    Example n8n call:
    ```
    POST http://localhost:8000/embed-batch
    
    {
      "texts": [
        "Test case 1: ...",
        "Test case 2: ...",
        "Test case 3: ..."
      ]
    }
    ```
    """
    
    if embedder is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not request.texts or len(request.texts) == 0:
        raise HTTPException(status_code=400, detail="Texts list cannot be empty")
    
    if len(request.texts) > 1000:
        raise HTTPException(
            status_code=400, 
            detail="Maximum batch size is 1000 texts"
        )
    
    try:
        # Generate embeddings (batch processing is faster)
        embeddings = embedder.encode(request.texts)
        
        # Format response
        embedding_dicts = [
            {
                "text": text,
                "embedding": embedding.tolist(),
                "dimension": 384
            }
            for text, embedding in zip(request.texts, embeddings)
        ]
        
        logger.info(f"✅ Embedded {len(request.texts)} texts → batch of 384-d vectors")
        
        return EmbedBatchResponse(
            embeddings=embedding_dicts,
            count=len(request.texts),
            model="all-MiniLM-L6-v2",
            timestamp=datetime.utcnow().isoformat() + "Z"
        )
    
    except Exception as e:
        logger.error(f"❌ Batch embedding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Root Endpoint
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "Embedding Service",
        "model": "all-MiniLM-L6-v2",
        "dimension": 384,
        "endpoints": {
            "health": "GET /health",
            "single": "POST /embed",
            "batch": "POST /embed-batch",
            "docs": "GET /docs"
        },
        "docs": "http://localhost:8000/docs"
    }


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Embedding Service")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Auto-reload on code changes")
    
    args = parser.parse_args()
    
    print("\n" + "="*80)
    print("🚀 Starting Embedding Service")
    print("="*80)
    print(f"📍 Server: http://{args.host}:{args.port}")
    print(f"📚 Docs:   http://{args.host}:{args.port}/docs")
    print(f"💚 Health: http://{args.host}:{args.port}/health")
    print("="*80 + "\n")
    
    uvicorn.run(
        "embedding_service:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info"
    )
