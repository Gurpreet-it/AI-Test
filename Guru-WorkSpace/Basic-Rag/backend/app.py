"""
RAG Explorer — FastAPI Backend
Handles PDF ingestion, chunking, Nomic embeddings (via Ollama),
ChromaDB storage, and Groq LLM query generation.
"""

import os
import re
from pathlib import Path
from typing import Optional

import requests
import chromadb
import pypdf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

# ── Configuration ────────────────────────────────────────────────────────────

DATA_DIR       = Path(__file__).parent.parent / "data"
CHROMA_PATH    = str(Path(__file__).parent / "chroma_db")
COLLECTION     = "rag_documents"
CHUNK_SIZE     = 600          # characters per chunk
CHUNK_OVERLAP  = 100          # overlap between chunks
OLLAMA_URL     = os.getenv("OLLAMA_URL", "http://localhost:11434")
NOMIC_MODEL    = "nomic-embed-text"
# Groq model — user requested "OpenGPT 120B"; closest Groq model is llama-3.3-70b-versatile.
# Set GROQ_MODEL env var to override.
GROQ_MODEL     = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

# ── App & Clients ─────────────────────────────────────────────────────────────

app = FastAPI(title="RAG Explorer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
groq_client   = Groq(api_key=os.getenv("GROQ_API_KEY", ""))


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_collection():
    return chroma_client.get_or_create_collection(
        name=COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def reset_collection():
    try:
        chroma_client.delete_collection(COLLECTION)
    except Exception:
        pass
    return get_collection()


def get_embedding(text: str) -> list[float]:
    """Call Ollama Nomic-embed-text to get a vector embedding."""
    resp = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": NOMIC_MODEL, "prompt": text},
        timeout=60,
    )
    if resp.status_code != 200:
        raise HTTPException(500, f"Ollama error: {resp.text}")
    return resp.json()["embedding"]


def extract_text(pdf_path: Path) -> str:
    """Extract all text from a PDF file using pypdf."""
    reader = pypdf.PdfReader(str(pdf_path))
    pages  = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            pages.append(t)
    return "\n".join(pages)


def chunk_text(text: str) -> list[dict]:
    """
    Split text into overlapping character-based chunks.
    Tries to break at sentence boundaries for cleaner chunks.
    """
    text   = re.sub(r"\s+", " ", text).strip()
    chunks = []
    start  = 0
    idx    = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))

        # Prefer breaking at a sentence boundary
        if end < len(text):
            for sep in (". ", ".\n", "! ", "? ", "; "):
                boundary = text.rfind(sep, start + CHUNK_SIZE // 2, end)
                if boundary != -1:
                    end = boundary + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append({"id": f"chunk_{idx}", "text": chunk, "start": start, "end": end})
            idx += 1

        start = max(start + 1, end - CHUNK_OVERLAP)

    return chunks


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "RAG Explorer API is running"}


@app.get("/status")
def status():
    """Return connectivity status for Ollama, ChromaDB, and Groq."""
    # ChromaDB
    try:
        col     = get_collection()
        db_ok   = True
        db_docs = col.count()
    except Exception as e:
        db_ok   = False
        db_docs = 0

    # Ollama + Nomic model
    try:
        r          = requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
        ollama_ok  = r.status_code == 200
        model_list = [m["name"] for m in r.json().get("models", [])]
        nomic_ok   = any(NOMIC_MODEL in m for m in model_list)
    except Exception:
        ollama_ok = False
        nomic_ok  = False

    # Groq
    groq_ok = bool(os.getenv("GROQ_API_KEY"))

    return {
        "chromadb": {"ok": db_ok, "chunks": db_docs},
        "ollama":   {"ok": ollama_ok, "nomic_available": nomic_ok},
        "groq":     {"ok": groq_ok, "model": GROQ_MODEL},
        "ready":    db_ok and ollama_ok and nomic_ok and groq_ok,
    }


@app.get("/data/files")
def list_files():
    """List PDF files available in the /data directory."""
    if not DATA_DIR.exists():
        return {"files": []}
    files = [
        {"name": f.name, "size_kb": round(f.stat().st_size / 1024, 1)}
        for f in sorted(DATA_DIR.glob("*.pdf"))
    ]
    return {"files": files}


@app.post("/ingest")
def ingest(filename: str):
    """
    Full ingestion pipeline:
      1. Read PDF  →  2. Extract text  →  3. Chunk  →  4. Embed (Nomic)  →  5. Store (ChromaDB)
    """
    pdf_path = DATA_DIR / filename
    if not pdf_path.exists():
        raise HTTPException(404, f"'{filename}' not found in data/ directory")

    # Step 1-2: Extract text
    raw_text = extract_text(pdf_path)
    if not raw_text.strip():
        raise HTTPException(400, "Could not extract text from PDF (may be scanned/image-based)")

    # Step 3: Chunk
    chunks = chunk_text(raw_text)

    # Step 4-5: Embed and store (reset collection first for clean state)
    collection = reset_collection()
    stored = []

    for chunk in chunks:
        embedding = get_embedding(chunk["text"])
        collection.add(
            ids        = [chunk["id"]],
            embeddings = [embedding],
            documents  = [chunk["text"]],
            metadatas  = [{"source": filename, "char_start": chunk["start"], "char_end": chunk["end"]}],
        )
        stored.append({
            "id":      chunk["id"],
            "preview": chunk["text"][:150] + ("…" if len(chunk["text"]) > 150 else ""),
            "chars":   len(chunk["text"]),
        })

    return {
        "status":      "success",
        "filename":    filename,
        "total_chars": len(raw_text),
        "chunk_count": len(chunks),
        "chunk_size":  CHUNK_SIZE,
        "overlap":     CHUNK_OVERLAP,
        "chunks":      stored,          # all chunks (for UI display)
    }


@app.get("/chunks")
def get_chunks(limit: int = 100, offset: int = 0):
    """Return stored chunks from ChromaDB (paginated)."""
    try:
        col  = get_collection()
        data = col.get(limit=limit, offset=offset)
    except Exception as e:
        return {"chunks": [], "total": 0}

    chunks = [
        {
            "id":       data["ids"][i],
            "text":     data["documents"][i],
            "metadata": data["metadatas"][i] if data["metadatas"] else {},
        }
        for i in range(len(data["ids"]))
    ]
    return {"chunks": chunks, "total": get_collection().count()}


class QueryRequest(BaseModel):
    question: str
    top_k: int = 4


@app.post("/query")
def query(req: QueryRequest):
    """
    RAG query pipeline:
      1. Embed query  →  2. Similarity search (ChromaDB)  →  3. Build context  →  4. Groq LLM
    """
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    col = get_collection()
    if col.count() == 0:
        raise HTTPException(400, "No documents ingested yet. Please ingest a PDF first.")

    # Step 1: Embed query
    query_vec = get_embedding(req.question)

    # Step 2: Retrieve top-k
    n = min(req.top_k, col.count())
    results = col.query(
        query_embeddings=[query_vec],
        n_results=n,
        include=["documents", "distances", "metadatas"],
    )

    retrieved = [
        {
            "id":         results["ids"][0][i],
            "text":       results["documents"][0][i],
            "distance":   round(results["distances"][0][i], 4),
            "similarity": round(1 - results["distances"][0][i], 4),
            "metadata":   results["metadatas"][0][i] if results["metadatas"] else {},
        }
        for i in range(len(results["ids"][0]))
    ]

    # Step 3: Build context string
    context_parts = [f"[{c['id']}]\n{c['text']}" for c in retrieved]
    context = "\n\n---\n\n".join(context_parts)

    # Step 4: Groq LLM generation
    system_msg = (
        "You are a precise assistant. Answer the user's question using ONLY the provided context. "
        "If the answer cannot be found in the context, say so clearly. "
        "Cite the chunk IDs (e.g., [chunk_3]) when referencing specific information."
    )
    user_msg = f"Context:\n{context}\n\nQuestion: {req.question}"

    completion = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user",   "content": user_msg},
        ],
        temperature=0.1,
        max_tokens=1024,
    )

    answer = completion.choices[0].message.content

    return {
        "question":        req.question,
        "retrieved_chunks": retrieved,
        "answer":          answer,
        "model":           GROQ_MODEL,
        "chunks_used":     len(retrieved),
    }
