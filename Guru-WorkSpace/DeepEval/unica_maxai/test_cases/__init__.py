"""Aggregates per-product test cases into a single TEST_CASES list.

Add a new product by creating `unica_maxai/test_cases/<product>.py` with a
`<PRODUCT>_TEST_CASES: List[MaxAITestCase]` list, then import/extend it here.
"""

from __future__ import annotations

from typing import Dict, List

from ..models import MaxAITestCase
from .campaign import CAMPAIGN_TEST_CASES
from .deliver import DELIVER_TEST_CASES
from .interact import INTERACT_TEST_CASES
from .journey import JOURNEY_TEST_CASES
from .offer import OFFER_TEST_CASES

TEST_CASES: List[MaxAITestCase] = [
    *CAMPAIGN_TEST_CASES,
    *INTERACT_TEST_CASES,
    *JOURNEY_TEST_CASES,
    *DELIVER_TEST_CASES,
    *OFFER_TEST_CASES,
]

TEST_CASES_BY_PRODUCT: Dict[str, List[MaxAITestCase]] = {
    "campaign": CAMPAIGN_TEST_CASES,
    "interact": INTERACT_TEST_CASES,
    "journey": JOURNEY_TEST_CASES,
    "deliver": DELIVER_TEST_CASES,
    "offer": OFFER_TEST_CASES,
}

__all__ = [
    "MaxAITestCase",
    "TEST_CASES",
    "TEST_CASES_BY_PRODUCT",
    "CAMPAIGN_TEST_CASES",
    "INTERACT_TEST_CASES",
    "JOURNEY_TEST_CASES",
    "DELIVER_TEST_CASES",
    "OFFER_TEST_CASES",
]
