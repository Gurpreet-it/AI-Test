"""Test cases for HCL Unica Offer (offer/incentive management).

TEMPLATES: written around Offer's general concepts (offer templates,
attributes, versions, retirement dates). Review and correct expected_answer
/ expected_context against your real MaxAI knowledge base before treating
scores as meaningful.
"""

from __future__ import annotations

from typing import List

from ..models import MaxAITestCase

OFFER_TEST_CASES: List[MaxAITestCase] = [
    MaxAITestCase(
        question="What is Unica Offer used for?",
        expected_answer="Unica Offer centrally manages reusable offers/incentives — including their content, attributes, and lifecycle — for use across Campaign, Interact, and Journey.",
        expected_context=["Unica Offer provides a central repository for defining, versioning, and managing marketing offers used by other Unica products."],
        metadata={"category": "offer", "difficulty": "easy", "test_type": "simple_factual"},
    ),
    MaxAITestCase(
        question="How do I create a new offer template, define an attribute like discount percentage, and then create an offer instance from it?",
        expected_answer="Create the offer template in Offer, add the discount-percentage attribute to the template, then create a specific offer instance and set that attribute's value.",
        expected_context=[
            "Offer templates define the reusable structure and attributes (e.g. discount percentage) shared by offers created from them.",
            "Offer instances are created from a template with specific attribute values filled in.",
        ],
        metadata={"category": "offer", "difficulty": "medium", "test_type": "multi_step"},
    ),
    MaxAITestCase(
        question="What is the difference between an offer's start date and retirement date, and which one determines when it stops being eligible for use?",
        expected_answer="The start date is when an offer becomes available for use, while the retirement date is when it stops being eligible; the retirement date determines when it can no longer be used.",
        expected_context=[
            "An offer's start date marks when it becomes active and usable in campaigns/interactions.",
            "The retirement date marks the point after which the offer is no longer eligible to be presented or assigned.",
        ],
        metadata={"category": "offer", "difficulty": "medium", "test_type": "multi_document"},
    ),
    MaxAITestCase(
        question="Can offers just expire automatically on their own once the retirement date hits, without someone manually disabling them?",
        expected_answer="Yes — once an offer's retirement date passes, it automatically becomes ineligible for further use without manual intervention.",
        expected_context=["Offer's lifecycle automatically enforces retirement dates, making offers ineligible after that date."],
        metadata={"category": "offer", "difficulty": "medium", "test_type": "ambiguous_wording"},
    ),
    MaxAITestCase(
        question="What performance tracking is available for offers used across campaigns?",
        expected_answer="Offer performance can be tracked in terms of metrics such as usage counts, response rates, and conversions when integrated with Campaign/Interact reporting.",
        expected_context=["Offer usage and response data can be tracked and reported on when offers are used in Campaign or Interact."],
        metadata={"category": "offer", "difficulty": "easy", "test_type": "answer_present_in_kb"},
    ),
    MaxAITestCase(
        question="What is the maximum number of offer templates supported in a specific Offer database configuration?",
        expected_answer="I don't have that information available.",
        expected_context=[],
        metadata={"category": "offer", "difficulty": "hard", "test_type": "answer_not_in_kb"},
    ),
    MaxAITestCase(
        question="Which year did Unica Offer win a Grammy for its offer templates?",
        expected_answer="Unica Offer has not won a Grammy; it is offer-management software, unrelated to music awards.",
        expected_context=["Unica Offer is a marketing offer-management product with no record of a Grammy award."],
        metadata={"category": "offer", "difficulty": "hard", "test_type": "hallucination_probe"},
    ),
    MaxAITestCase(
        question="Unrelated, but I enjoy chess — anyway, how do I create a new version of an existing offer without changing the original?",
        expected_answer="Use Offer's versioning capability to create a new version of the offer, which preserves the original while allowing changes on the new version.",
        expected_context=["Offers support versioning, allowing a new offer version to be created while keeping prior versions intact."],
        metadata={"category": "offer", "difficulty": "medium", "test_type": "irrelevant_or_misleading"},
    ),
    MaxAITestCase(
        question="Why can't I use this offer?",
        expected_answer="I don't have enough information to answer that — please share the offer name/ID and the context (campaign, channel) where you're trying to use it.",
        expected_context=[],
        metadata={"category": "offer", "difficulty": "medium", "test_type": "incomplete_information"},
    ),
    MaxAITestCase(
        question="What is the exact discount margin approved internally for this customer's specific offer contract?",
        expected_answer="I don't have enough information to answer that; approved discount margins are business/contract-specific and not documented in this knowledge base.",
        expected_context=[],
        metadata={"category": "offer", "difficulty": "hard", "test_type": "insufficient_information"},
    ),
]
