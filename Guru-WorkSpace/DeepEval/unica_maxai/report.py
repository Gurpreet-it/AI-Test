"""Result data model + text formatting for the per-test and summary reports."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .test_cases import MaxAITestCase

METRIC_DISPLAY_ORDER = [
    ("contextual_precision", "Contextual Precision"),
    ("contextual_recall", "Contextual Recall"),
    ("contextual_relevancy", "Contextual Relevancy"),
    ("faithfulness", "Faithfulness"),
    ("answer_relevancy", "Answer Relevancy"),
    ("hallucination", "Hallucination"),
    ("correctness", "Correctness"),
]


@dataclass
class MetricOutcome:
    score: Optional[float] = None
    success: Optional[bool] = None
    reason: Optional[str] = None
    error: Optional[str] = None  # set if the metric could not be evaluated
    skipped_reason: Optional[str] = None  # set if intentionally not run


@dataclass
class TestCaseResult:
    test_case: MaxAITestCase
    actual_answer: Optional[str] = None
    retrieved_context: Optional[List[str]] = None
    api_error: Optional[str] = None
    metric_outcomes: Dict[str, MetricOutcome] = field(default_factory=dict)

    @property
    def overall_pass(self) -> bool:
        if self.api_error:
            return False
        evaluated = [m for m in self.metric_outcomes.values() if m.success is not None]
        return bool(evaluated) and all(m.success for m in evaluated)


def _format_metric_line(label: str, outcome: Optional[MetricOutcome]) -> str:
    if outcome is None:
        return f"{label}: N/A (not applicable to this test case)"
    if outcome.skipped_reason:
        return f"{label}: N/A ({outcome.skipped_reason})"
    if outcome.error:
        return f"{label}: ERROR ({outcome.error})"
    return f"{label}: {outcome.score:.3f} ({'PASS' if outcome.success else 'FAIL'})"


def format_test_case_report(result: TestCaseResult) -> str:
    tc = result.test_case
    lines = [
        "-" * 70,
        "Test Case",
        f"Question: {tc.question}",
        f"Expected Answer: {tc.expected_answer}",
        f"Actual Answer: {result.actual_answer if not result.api_error else f'ERROR - {result.api_error}'}",
        "",
    ]
    for key, label in METRIC_DISPLAY_ORDER:
        lines.append(_format_metric_line(label, result.metric_outcomes.get(key)))
    lines.append("")
    lines.append(f"Overall: {'PASS' if result.overall_pass else 'FAIL'}")
    return "\n".join(lines)


def _average(values: List[float]) -> Optional[float]:
    return sum(values) / len(values) if values else None


def format_summary(results: List[TestCaseResult]) -> str:
    total = len(results)
    passed = sum(1 for r in results if r.overall_pass)
    failed = total - passed

    averages = {}
    for key, _ in METRIC_DISPLAY_ORDER:
        scores = [
            r.metric_outcomes[key].score
            for r in results
            if key in r.metric_outcomes and r.metric_outcomes[key].score is not None
        ]
        averages[key] = _average(scores)

    lines = [
        "=" * 70,
        "Summary",
        f"Total Test Cases: {total}",
        f"Passed: {passed}",
        f"Failed: {failed}",
        "",
    ]
    for key, label in METRIC_DISPLAY_ORDER:
        value = averages[key]
        lines.append(f"Average {label}: {'N/A' if value is None else f'{value:.3f}'}")
    return "\n".join(lines)
