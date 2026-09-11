#!/usr/bin/env python3
"""Simple HTTP server for serving DeepEval UI and API."""

from __future__ import annotations

import http.server
import socketserver
import json
import os
import subprocess
import sys
import tempfile
import threading
import time
import datetime
from dataclasses import asdict
from pathlib import Path

# Paths relative to this script's location
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
EVALUATION_LOCK = threading.Lock()

# Try multiple locations for test_cases.json
TEST_CASES_PATHS = [
    SCRIPT_DIR / "unica_maxai" / "test_cases.json",
    SCRIPT_DIR / "test_cases.json",
    SCRIPT_DIR.parent / "unica_maxai" / "test_cases.json",
    SCRIPT_DIR.parent / "test_cases.json",
]

def get_test_cases_path():
    """Find the first existing test_cases.json path."""
    for path in TEST_CASES_PATHS:
        if path.exists():
            return path
    return None


def load_test_cases():
    """Load the canonical per-product test cases, falling back to JSON."""
    project_path = str(PROJECT_DIR)
    if project_path not in sys.path:
        sys.path.insert(0, project_path)

    try:
        from unica_maxai.test_cases import TEST_CASES

        return [asdict(test_case) for test_case in TEST_CASES]
    except ImportError:
        test_cases_path = get_test_cases_path()
        if test_cases_path is None:
            raise FileNotFoundError("No Python or JSON test cases were found")
        with open(test_cases_path, 'r', encoding='utf-8') as file:
            return json.load(file)


def get_judge_config():
    """Return non-secret judge settings from the project environment."""
    env_values = {}
    env_file = PROJECT_DIR / ".env.local"
    if env_file.exists():
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env_values[key.strip()] = value.strip().strip('"\'')

    model = os.environ.get("MISTRAL_MODEL") or env_values.get("MISTRAL_MODEL", "qwen-128k:latest")
    base_url = os.environ.get("MISTRAL_BASE_URL") or env_values.get(
        "MISTRAL_BASE_URL", "http://localhost:11434/v1"
    )
    provider = "Ollama" if "localhost:11434" in base_url or "127.0.0.1:11434" in base_url else "Custom"
    return {"model": model, "provider": provider}


class DeepEvalHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves test cases from JSON file."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        """Run real evaluations or handle the legacy /ask endpoint."""
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'

        try:
            data = json.loads(body) if body else {}
            question = data.get('question', '')
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = {}

        if self.path == '/evaluate':
            if not EVALUATION_LOCK.acquire(blocking=False):
                self.send_json(409, {"error": "Another evaluation is already running"})
                return
            try:
                self.run_evaluation(data.get('product', ''))
            finally:
                EVALUATION_LOCK.release()
            return

        if self.path != '/ask':
            self.send_error(404)
            return

        question = data.get('question', '')

        try:
            test_cases = load_test_cases()
        except (FileNotFoundError, ImportError):
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Test cases not found"}).encode())
            return

        matching_case = None
        for tc in test_cases:
            if question.lower() in tc['question'].lower():
                matching_case = tc
                break

        if not matching_case:
            # If no exact match, return a generic response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "answer": f"This is a simulated response for: {question}",
                "context": [f"Context for: {question}"],
                "tokens": 1500
            }
            self.wfile.write(json.dumps(response).encode())
            return

        # Return the expected answer and context from the test case
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = {
            "answer": matching_case.get('expected_answer', ''),
            "context": matching_case.get('expected_context', []),
            "tokens": 1500
        }
        self.wfile.write(json.dumps(response).encode())

    def run_evaluation(self, product):
        """Execute the same real DeepEval suite used by the command-line runner."""
        from unica_maxai.test_cases import TEST_CASES_BY_PRODUCT

        if product not in TEST_CASES_BY_PRODUCT:
            self.send_json(400, {"error": f"Unknown product: {product}"})
            return

        python_path = PROJECT_DIR / ".venv" / "bin" / "python"
        if not python_path.exists():
            self.send_json(500, {"error": "Project virtual environment was not found"})
            return

        started = time.monotonic()
        with tempfile.TemporaryDirectory(prefix="deepeval-ui-") as temp_dir:
            output_path = Path(temp_dir) / "results.json"
            command = [
                str(python_path),
                str(PROJECT_DIR / "run_unica_maxai_suite.py"),
                "--product",
                product,
                "--concurrency",
                "1",
                "--output-json",
                str(output_path),
            ]
            try:
                completed = subprocess.run(
                    command,
                    cwd=PROJECT_DIR,
                    capture_output=True,
                    text=True,
                    timeout=3600,
                )
            except subprocess.TimeoutExpired:
                self.send_json(504, {"error": "Evaluation exceeded the one-hour timeout"})
                return

            if not output_path.exists():
                error = completed.stderr.strip() or completed.stdout.strip() or "Evaluation failed"
                self.send_json(500, {"error": error[-2000:]})
                return

            results = json.loads(output_path.read_text(encoding="utf-8"))

        self.send_json(
            200,
            {
                "results": results,
                "elapsed_seconds": round(time.monotonic() - started, 2),
                "exit_code": completed.returncode,
            },
        )

    def send_json(self, status, payload):
        content = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Content-Length', len(content))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        """Handle GET requests, serving index.html at root and test_cases.json for JSON endpoint."""

        # Serve index.html at root path
        if self.path == '/':
            SCRIPT_DIR = Path(__file__).resolve().parent
            INDEX_PATH = SCRIPT_DIR / 'index.html'
            if INDEX_PATH.exists():
                with open(INDEX_PATH, 'r', encoding='utf-8') as f:
                    content = f.read().encode('utf-8')
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
            else:
                # Fallback to default handler if no index.html
                super().do_GET()
        elif self.path == '/config':
            content = json.dumps(get_judge_config()).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        elif self.path == '/unica_maxai/test_cases.json':
            try:
                content = json.dumps(load_test_cases()).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Content-Length', len(content))
                self.end_headers()
                self.wfile.write(content)
            except (FileNotFoundError, ImportError):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Test cases not found"}).encode())
        else:
            super().do_GET()

    def log_message(self, format, *args):
        """Override to customize logging - fixed without log_date_time dependency."""
        timestamp = datetime.datetime.now().isoformat()
        print(f"[{timestamp}] {args[0]}")

def run_server(port=8100):
    """Run the HTTP server with threading support for concurrent requests."""

    class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        """Threading TCP server to handle multiple requests concurrently."""
        allow_reuse_address = True  # Allow port reuse without waiting
        daemon_threads = True  # Keep threads as daemons

    with ThreadingTCPServer(("", port), DeepEvalHandler) as httpd:
        print(f"DeepEval UI Server running at http://localhost:{port}")
        test_cases = load_test_cases()
        products = sorted({case["metadata"]["category"] for case in test_cases})
        print(f"Loaded {len(test_cases)} test cases for: {', '.join(products)}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="DeepEval UI Server")
    parser.add_argument("--port", type=int, default=8100, help="Port to run the server on (default: 8100)")
    args = parser.parse_args()

    run_server(args.port)
