#!/usr/bin/env python3
"""Simple HTTP server for serving DeepEval UI and API."""

from __future__ import annotations

import http.server
import socketserver
import importlib.util
import json
import os
import sys
import threading
import time
import datetime
import uuid
from dataclasses import asdict
from pathlib import Path
from urllib.parse import parse_qs, urlparse

# Paths relative to this script's location
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
EVALUATION_LOCK = threading.Lock()
RUN_STATE_LOCK = threading.Lock()
HISTORY_LOCK = threading.Lock()
HISTORY_PATH = SCRIPT_DIR / "run_history.json"
ACTIVE_EVALUATION = None

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


def load_run_history(product):
    """Return saved evaluation runs for one product, newest first."""
    if not HISTORY_PATH.exists():
        return []
    contents = HISTORY_PATH.read_text(encoding="utf-8")
    history = json.loads(contents) if contents.strip() else {}
    return sorted(history.get(product, []), key=lambda run: run["started_at"], reverse=True)


def save_run_history(record):
    """Persist a run record atomically so history survives restarts."""
    with HISTORY_LOCK:
        history = {}
        if HISTORY_PATH.exists():
            contents = HISTORY_PATH.read_text(encoding="utf-8")
            history = json.loads(contents) if contents.strip() else {}
        history.setdefault(record["product"], []).append(record)
        temporary_path = HISTORY_PATH.with_suffix(".tmp")
        temporary_path.write_text(json.dumps(history, indent=2), encoding="utf-8")
        temporary_path.replace(HISTORY_PATH)


def build_run_record(product, started_at, started, results=None, exit_code=None, error=None):
    completed_at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    return {
        "run_id": uuid.uuid4().hex,
        "product": product,
        "started_at": started_at,
        "completed_at": completed_at,
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "exit_code": exit_code,
        "error": error,
        "results": results or [],
    }


def run_evaluation(evaluation, test_cases):
    """Run one product in the background and update its test-level progress."""
    started = time.monotonic()
    product = evaluation["product"]
    try:
        from unica_maxai.runner import _results_to_json, run_suite

        def update_progress(event, index, test_case, result):
            with RUN_STATE_LOCK:
                test_progress = evaluation["tests"][index]
                test_progress["status"] = "running" if event == "started" else "completed"
                if result is not None:
                    result_data = _results_to_json([result])[0]
                    has_error = result.api_error or any(
                        outcome.error for outcome in result.metric_outcomes.values()
                    )
                    test_progress["status"] = (
                        "error" if has_error else ("passed" if result.overall_pass else "failed")
                    )
                    test_progress["result"] = result_data
                    evaluation["results"][index] = result_data
                    evaluation["completed"] += 1

        results = run_suite(
            test_cases=test_cases,
            print_report=False,
            concurrency=1,
            progress_callback=update_progress,
        )
        results_data = _results_to_json(results)
        record = build_run_record(
            product,
            evaluation["started_at"],
            started,
            results=results_data,
            exit_code=0 if all(result.overall_pass for result in results) else 1,
        )
        save_run_history(record)
        with RUN_STATE_LOCK:
            evaluation["results"] = results_data
            evaluation["elapsed_seconds"] = record["elapsed_seconds"]
            evaluation["status"] = "completed"
    except Exception as error:
        results_data = [result for result in evaluation["results"] if result is not None]
        record = build_run_record(
            product,
            evaluation["started_at"],
            started,
            results=results_data,
            exit_code=1,
            error=str(error),
        )
        save_run_history(record)
        with RUN_STATE_LOCK:
            evaluation["error"] = str(error)
            evaluation["elapsed_seconds"] = record["elapsed_seconds"]
            evaluation["status"] = "failed"
    finally:
        EVALUATION_LOCK.release()


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

    model = os.environ.get("LLM_MODEL") or env_values.get("LLM_MODEL", "qwen3:14b")
    base_url = os.environ.get("LLM_BASE_URL") or env_values.get(
        "LLM_BASE_URL", "http://localhost:11434/v1"
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
            product = data.get('product', '')
            project_path = str(PROJECT_DIR)
            if project_path not in sys.path:
                sys.path.insert(0, project_path)
            from unica_maxai.test_cases import TEST_CASES_BY_PRODUCT

            if product not in TEST_CASES_BY_PRODUCT:
                self.send_json(400, {"error": f"Unknown product: {product}"})
                return
            if not EVALUATION_LOCK.acquire(blocking=False):
                self.send_json(409, {"error": "Another evaluation is already running"})
                return
            global ACTIVE_EVALUATION
            run_id = uuid.uuid4().hex
            started_at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
            test_cases = TEST_CASES_BY_PRODUCT[product]
            evaluation = {
                "run_id": run_id,
                "product": product,
                "started_at": started_at,
                "status": "running",
                "completed": 0,
                "total": len(test_cases),
                "tests": [
                    {"index": index, "question": test_case.question, "status": "queued", "result": None}
                    for index, test_case in enumerate(test_cases)
                ],
                "results": [None] * len(test_cases),
                "elapsed_seconds": 0,
                "error": None,
            }
            with RUN_STATE_LOCK:
                ACTIVE_EVALUATION = evaluation
            threading.Thread(
                target=run_evaluation,
                args=(evaluation, test_cases),
                daemon=True,
            ).start()
            self.send_json(202, {"run_id": run_id, "started_at": started_at})
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

    def send_json(self, status, payload):
        content = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Content-Length', len(content))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        """Handle GET requests, serving index.html at root and test_cases.json for JSON endpoint."""
        parsed_url = urlparse(self.path)
        request_path = parsed_url.path

        # Serve index.html at root path
        if request_path == '/':
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
        elif request_path == '/config':
            content = json.dumps(get_judge_config()).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Content-Length', len(content))
            self.end_headers()
            self.wfile.write(content)
        elif request_path == '/history':
            product = parse_qs(parsed_url.query).get("product", [""])[0]
            if not product:
                self.send_json(400, {"error": "A product query parameter is required"})
                return
            try:
                self.send_json(200, {"product": product, "runs": load_run_history(product)})
            except (OSError, json.JSONDecodeError) as error:
                self.send_json(500, {"error": f"Could not load run history: {error}"})
        elif request_path == '/evaluation-progress':
            run_id = parse_qs(parsed_url.query).get("run_id", [""])[0]
            with RUN_STATE_LOCK:
                evaluation = ACTIVE_EVALUATION
                if evaluation is None or evaluation["run_id"] != run_id:
                    self.send_json(404, {"error": "Evaluation run was not found"})
                    return
                snapshot = json.loads(json.dumps(evaluation))
            self.send_json(200, snapshot)
        elif request_path == '/unica_maxai/test_cases.json':
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
    if importlib.util.find_spec("deepeval") is None:
        raise SystemExit(
            f"DeepEval is not installed for {sys.executable}. From the DeepEval root, "
            "start the dashboard with `venv/bin/python ui/server.py --port 8000`."
        )

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
