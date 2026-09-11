#!/usr/bin/env python3
"""CLI entrypoint: run the full Unica MaxAI DeepEval suite and print a report.

Example:
    python run_unica_maxai_suite.py
    python run_unica_maxai_suite.py --output-json results.json
"""

from unica_maxai.runner import main

if __name__ == "__main__":
    raise SystemExit(main())
