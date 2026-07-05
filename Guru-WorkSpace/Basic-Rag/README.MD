# RAG Explorer

A full-stack **Retrieval-Augmented Generation (RAG)** application that lets you upload PDF documents, chunk and embed them locally, store them in a vector database, and query them using a Groq-powered LLM — all through a React UI.

---

## Architecture

```
frontend (React + Vite)
        │
        │  HTTP (port 5173 → 8000)
        ▼
backend (FastAPI)
   ├── PDF ingestion & text extraction  (pypdf)
   ├── Text chunking (600 chars / 100 overlap)
   ├── Embeddings via Ollama nomic-embed-text
   ├── Vector store — ChromaDB (cosine similarity)
   └── LLM responses via Groq (llama-3.3-70b-versatile)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5 |
| Backend | FastAPI, Uvicorn |
| Embeddings | Ollama `nomic-embed-text` (local) |
| Vector DB | ChromaDB (persistent, local) |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| PDF parsing | pypdf |

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Ollama** — [https://ollama.com](https://ollama.com)
- **Groq API key** — [https://console.groq.com](https://console.groq.com)

Pull the embedding model once:

```bash
ollama pull nomic-embed-text
```

---

## Project Structure

```
Basic-Rag/
├── start.sh                  # One-command startup script
├── data/                     # Drop your PDF files here
│   └── *.pdf
├── backend/
│   ├── app.py                # FastAPI app — all RAG logic
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variable template
│   └── chroma_db/            # ChromaDB persistent storage (auto-created)
└── frontend/
    ├── index.html
    ├── package.json
    └── src/                  # React components
```

---

## Setup & Run

### 1. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 2. One-command start (recommended)

```bash
chmod +x start.sh
./start.sh
```

This will:
- Create a Python virtualenv and install dependencies
- Load `.env` variables
- Start the FastAPI backend on **http://localhost:8000**
- Install frontend npm packages
- Start the Vite dev server on **http://localhost:5173**

### 3. Manual start

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/status` | Check Ollama, ChromaDB, and Groq connectivity |
| `GET` | `/data/files` | List available PDF files in `data/` |
| `POST` | `/ingest` | Ingest a PDF — chunk, embed, store in ChromaDB |
| `POST` | `/query` | Query the RAG pipeline with a natural language question |
| `POST` | `/reset` | Clear the ChromaDB collection |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | *(required)* | Your Groq API key |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq model to use for responses |

---

## How It Works

1. **Ingest** — A PDF from `data/` is parsed with `pypdf`, split into 600-character chunks (100-char overlap), and each chunk is embedded using Ollama's `nomic-embed-text` model.
2. **Store** — Embeddings are persisted in a local ChromaDB collection with cosine similarity indexing.
3. **Query** — Your question is embedded, the top-k most similar chunks are retrieved, and a Groq LLM generates an answer grounded in those chunks.

---

## Sample Data

A sample PDF (`MultiArmedBandit_ABTest_Design.pdf`) is included in `data/` to test the pipeline end-to-end.
