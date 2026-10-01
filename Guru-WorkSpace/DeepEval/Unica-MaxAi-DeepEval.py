"""DeepEval test suite for the Unica MaxAI orchestrator query endpoint.

Run with:
    deepeval test run Unica-MaxAi-DeepEval.py
or plain pytest:
    pytest Unica-MaxAi-DeepEval.py -v

For a human-readable report matching the spec's exact report/summary format,
use `run_unica_maxai_suite.py` instead (it drives the same modules but
prints per-test-case + aggregated scores rather than pytest's own output).

Setup: this suite judges responses with a locally-hosted Mistral model
(see unica_maxai/judge.py and .env.example for configuration) rather than a
hosted LLM, per project requirements.
"""

import asyncio

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from unica_maxai.api_client import MaxAIClient
from unica_maxai.config import MaxAIAPIConfig, MetricThresholds, MistralJudgeConfig
from unica_maxai.judge import MistralJudge
from unica_maxai.metrics import build_metrics
from unica_maxai.test_cases import TEST_CASES_BY_PRODUCT

asyncio.set_event_loop(asyncio.new_event_loop())

_client = MaxAIClient(MaxAIAPIConfig.from_env())
_judge = MistralJudge(MistralJudgeConfig.from_env())
_thresholds = MetricThresholds.from_env()

# Product-prefixed ids so a single product can be selected with `-k <product>`.
_CASES = [(product, tc) for product, cases in TEST_CASES_BY_PRODUCT.items() for tc in cases]
_IDS = [f"{product}: {tc.question}" for product, tc in _CASES]


@pytest.mark.parametrize("tc", [tc for _, tc in _CASES], ids=_IDS)
def test_maxai_response(tc):
    api_result = _client.ask(tc.question)
    assert api_result.ok, f"MaxAI API call failed for question={tc.question!r}: {api_result.error}"

    has_retrieval_context = bool(api_result.retrieved_context)

    test_case = LLMTestCase(
        input=tc.question,
        actual_output=api_result.answer,
        expected_output=tc.expected_answer,
        context=tc.expected_context or None,
        retrieval_context=api_result.retrieved_context,
    )

    metrics = build_metrics(_judge, _thresholds, has_retrieval_context=has_retrieval_context)
    assert_test(test_case, list(metrics.values()))
