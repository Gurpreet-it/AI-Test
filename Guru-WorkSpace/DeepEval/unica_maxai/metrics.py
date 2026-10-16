"""Builds DeepEval metric instances, wired to the local LLM judge.

Retrieval-evaluation metrics (ContextualPrecision/Recall/Relevancy,
Faithfulness) require DeepEval's `retrieval_context` — i.e. what the RAG
system actually retrieved. If the MaxAI API does not expose that in its
response, we do NOT fabricate it: those metrics are simply skipped for that
test case and the report clearly marks them as "N/A (no retrieval context
exposed by API)". This keeps retrieval evaluation cleanly separated from
final-answer evaluation (Answer Relevancy, Hallucination, Correctness),
which only need the question/answer/expected-answer/ground-truth-context and
can always run.
"""

from __future__ import annotations

from typing import Dict, List

from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
    GEval,
    HallucinationMetric,
)
from deepeval.metrics.answer_relevancy import AnswerRelevancyTemplate
from deepeval.test_case import LLMTestCaseParams

from .config import MetricThresholds

# Names of the metrics that require `retrieval_context` on the test case.
RETRIEVAL_METRIC_NAMES = (
    "contextual_precision",
    "contextual_recall",
    "contextual_relevancy",
    "faithfulness",
)


class SourceAwareAnswerRelevancyTemplate(AnswerRelevancyTemplate):
    @staticmethod
    def generate_verdicts(input: str, statements: List[str]) -> str:
        formatted_statements = "\n".join(
            f"{index + 1}. {statement}" for index, statement in enumerate(statements)
        )
        return (
            "For each statement, judge whether it helps answer the user's input.\n"
            "Use 'yes' for directly relevant content, 'idk' for relevant supporting "
            "information, and 'no' only for unrelated or unsupported content.\n"
            "A citation to a relevant source, including its document title, page number, "
            "or URL, is supporting information and must not be marked 'no' merely because "
            "it is a citation. A citation to an unrelated source may be marked 'no'.\n"
            "Return one verdict per statement in valid JSON with a 'verdicts' list. "
            "Each item must have a 'verdict' of 'yes', 'idk', or 'no'. Include a 'reason' "
            "only for 'idk' or 'no'. The number of verdicts must match the number of statements.\n\n"
            f"Input:\n{input}\n\nStatements:\n{formatted_statements}\n\nJSON:\n"
        )


def build_metrics(judge, thresholds: MetricThresholds, has_retrieval_context: bool) -> Dict[str, object]:
    """Return {metric_name: metric_instance} for the metrics that can run.

    `has_retrieval_context` gates the retrieval-quality metrics (see module
    docstring). Final-answer metrics always run.
    """
    metrics: Dict[str, object] = {}

    if has_retrieval_context:
        metrics["contextual_precision"] = ContextualPrecisionMetric(
            threshold=thresholds.contextual_precision,
            model=judge,
            include_reason=True,
            async_mode=False,
        )
        metrics["contextual_recall"] = ContextualRecallMetric(
            threshold=thresholds.contextual_recall,
            model=judge,
            include_reason=True,
            async_mode=False,
        )
        metrics["contextual_relevancy"] = ContextualRelevancyMetric(
            threshold=thresholds.contextual_relevancy,
            model=judge,
            include_reason=True,
            async_mode=False,
        )
        metrics["faithfulness"] = FaithfulnessMetric(
            threshold=thresholds.faithfulness,
            model=judge,
            include_reason=True,
            async_mode=False,
        )

    metrics["answer_relevancy"] = AnswerRelevancyMetric(
        threshold=thresholds.answer_relevancy,
        model=judge,
        include_reason=True,
        async_mode=False,
        evaluation_template=SourceAwareAnswerRelevancyTemplate,
    )

    # HallucinationMetric in this DeepEval version scores FACTUAL ALIGNMENT:
    # the fraction of `context` entries the answer does not contradict, so a
    # higher score is better and threshold is the minimum required.
    metrics["hallucination"] = HallucinationMetric(
        threshold=thresholds.hallucination,
        model=judge,
        async_mode=False,
    )

    metrics["correctness"] = GEval(
        name="Correctness",
        criteria=(
            "Determine whether 'actual output' is factually correct and consistent with "
            "'expected output' for the given 'input' question. Penalize answers that "
            "contradict the expected answer, omit its key facts, or add unsupported claims."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=thresholds.correctness,
        model=judge,
        async_mode=False,
    )

    return metrics
