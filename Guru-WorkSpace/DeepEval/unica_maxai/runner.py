"""Orchestrates: API calls -> DeepEval metric evaluation -> reporting.

Usage (see run_unica_maxai_suite.py for the CLI entrypoint):

    from unica_maxai.runner import run_suite
    results = run_suite()
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from typing import List, Optional

from deepeval.test_case import LLMTestCase

from .api_client import MaxAIClient
from .config import MaxAIAPIConfig, MetricThresholds, MistralJudgeConfig
from .html_report import write_html_report
from .judge import MistralJudge
from .metrics import RETRIEVAL_METRIC_NAMES, build_metrics
from .report import MetricOutcome, TestCaseResult, format_summary, format_test_case_report
from .test_cases import TEST_CASES, TEST_CASES_BY_PRODUCT, MaxAITestCase


def _evaluate_metric(name: str, metric, test_case: LLMTestCase) -> MetricOutcome:
    try:
        metric.measure(test_case)
        return MetricOutcome(score=metric.score, success=metric.is_successful(), reason=getattr(metric, "reason", None))
    except Exception as exc:  # DeepEval/model/network failures during evaluation
        return MetricOutcome(error=str(exc))


def run_single_test_case(
    tc: MaxAITestCase,
    client: MaxAIClient,
    judge,
    thresholds: MetricThresholds,
) -> TestCaseResult:
    api_result = client.ask(tc.question)
    result = TestCaseResult(test_case=tc)

    if not api_result.ok:
        result.api_error = api_result.error
        return result

    result.actual_answer = api_result.answer
    result.retrieved_context = api_result.retrieved_context
    has_retrieval_context = bool(api_result.retrieved_context)

    llm_test_case = LLMTestCase(
        input=tc.question,
        actual_output=api_result.answer,
        expected_output=tc.expected_answer,
        # Ground-truth context (ignored by ContextualPrecision/Recall/Relevancy
        # and Faithfulness, which use retrieval_context instead).
        context=tc.expected_context or None,
        retrieval_context=api_result.retrieved_context,
    )

    metrics = build_metrics(judge, thresholds, has_retrieval_context=has_retrieval_context)
    for name, metric in metrics.items():
        result.metric_outcomes[name] = _evaluate_metric(name, metric, llm_test_case)

    if not has_retrieval_context:
        for name in RETRIEVAL_METRIC_NAMES:
            result.metric_outcomes[name] = MetricOutcome(
                skipped_reason="API response did not expose retrieved context"
            )

    return result


def run_suite(
    test_cases: Optional[List[MaxAITestCase]] = None,
    print_report: bool = True,
    concurrency: int = 1,
) -> List[TestCaseResult]:
    test_cases = test_cases if test_cases is not None else TEST_CASES

    api_config = MaxAIAPIConfig.from_env()
    judge_config = MistralJudgeConfig.from_env()
    thresholds = MetricThresholds.from_env()

    client = MaxAIClient(api_config)
    judge = MistralJudge(judge_config)

    def run(tc: MaxAITestCase) -> TestCaseResult:
        return run_single_test_case(tc, client, judge, thresholds)

    if sys.version_info >= (3, 14) and concurrency > 1:
        print(
            "Warning: Python 3.14 can hang during ThreadPoolExecutor shutdown. "
            "Forcing sequential execution to avoid the 'Exception ignored on threading shutdown' issue."
        )
        concurrency = 1

    if concurrency > 1 and len(test_cases) > 1:
        # Authenticate once up front so workers share one token/session
        # instead of racing to create their own.
        try:
            client.login()
        except Exception:
            pass  # let the per-test-case error handling report it
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            results = list(pool.map(run, test_cases))
    else:
        results = [run(tc) for tc in test_cases]

    if print_report:
        for result in results:
            print(format_test_case_report(result))
        print(format_summary(results))

    return results


def _results_to_json(results: List[TestCaseResult]) -> list:
    out = []
    for r in results:
        out.append(
            {
                "question": r.test_case.question,
                "expected_answer": r.test_case.expected_answer,
                "actual_answer": r.actual_answer,
                "api_error": r.api_error,
                "metadata": r.test_case.metadata,
                "metrics": {
                    name: {
                        "score": o.score,
                        "success": o.success,
                        "reason": o.reason,
                        "error": o.error,
                        "skipped_reason": o.skipped_reason,
                    }
                    for name, o in r.metric_outcomes.items()
                },
                "overall_pass": r.overall_pass,
            }
        )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the Unica MaxAI DeepEval suite")
    parser.add_argument("--output-json", help="Optional path to write results as JSON")
    parser.add_argument(
        "--output-html",
        nargs="?",
        const="maxai_report.html",
        help="Write a shareable interactive HTML report (default: maxai_report.html)",
    )
    parser.add_argument(
        "--product",
        action="append",
        choices=sorted(TEST_CASES_BY_PRODUCT),
        help="Only run test cases for this product (repeatable). Default: all products.",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=1,
        help="Test cases to evaluate in parallel (default: 1 for local model stability).",
    )
    args = parser.parse_args()

    if args.product:
        selected = [tc for p in args.product for tc in TEST_CASES_BY_PRODUCT[p]]
        print(f"Running {len(selected)} test case(s) for: {', '.join(args.product)}\n")
    else:
        selected = None

    results = run_suite(test_cases=selected, concurrency=args.concurrency)

    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as fh:
            json.dump(_results_to_json(results), fh, indent=2)

    if args.output_html:
        title = "Unica MaxAI DeepEval Report"
        if args.product:
            title += " — " + ", ".join(args.product)
        write_html_report(results, args.output_html, title=title)
        print(f"\nHTML report written to: {os.path.abspath(args.output_html)}")

    return 0 if all(r.overall_pass for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
