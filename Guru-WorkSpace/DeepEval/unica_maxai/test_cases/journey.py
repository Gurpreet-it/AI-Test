"""Test cases for HCL Unica Journey (customer journey orchestration).

TEMPLATES: written around Journey's general concepts (journey canvas,
triggers, wait steps, decision splits). Review/correct expected_answer and
expected_context against your real MaxAI knowledge base before treating
scores as meaningful.
"""

from __future__ import annotations

from typing import List

from ..models import MaxAITestCase

JOURNEY_TEST_CASES: List[MaxAITestCase] = [
    MaxAITestCase(
        question="What is Unica Journey used for?",
        expected_answer="Unica Journey orchestrates multi-step, multi-channel customer journeys, guiding customers through personalized paths over time.",
        expected_context=["Unica Journey lets marketers design and automate cross-channel customer journeys using a visual canvas."],
        metadata={"category": "journey", "difficulty": "easy", "test_type": "simple_factual"},
    ),
    MaxAITestCase(
        question="How do I build a journey that starts on sign-up, waits three days, and then sends a follow-up email?",
        expected_answer="Add an entry trigger for the sign-up event, add a Wait step configured for 3 days, then add a channel step that sends the follow-up email.",
        expected_context=[
            "Journeys start from an entry/trigger event such as a customer sign-up.",
            "Wait steps pause a customer's progression for a configured duration before the next step executes.",
        ],
        metadata={"category": "journey", "difficulty": "medium", "test_type": "multi_step"},
    ),
    MaxAITestCase(
        question="What is the difference between a decision split and an A/B split in Journey, and which one is used to test messaging variants?",
        expected_answer="A decision split routes customers based on attribute or behavior conditions, while an A/B split randomly divides customers to test different variants; A/B splits are used to test messaging variants.",
        expected_context=[
            "Decision splits branch customers based on rule conditions evaluated against their data.",
            "A/B splits randomly allocate customers across branches to compare outcomes, commonly used for message/variant testing.",
        ],
        metadata={"category": "journey", "difficulty": "medium", "test_type": "multi_document"},
    ),
    MaxAITestCase(
        question="Can the journey just keep running for new customers as they come in, without me restarting it?",
        expected_answer="Yes — an activated journey continuously evaluates and enrolls new customers matching its entry criteria without manual restarts.",
        expected_context=["Active journeys continuously listen for entry events and automatically enroll qualifying customers."],
        metadata={"category": "journey", "difficulty": "medium", "test_type": "ambiguous_wording"},
    ),
    MaxAITestCase(
        question="What reporting/analytics does Journey provide for tracking customer progress through a journey?",
        expected_answer="Journey provides analytics on customer counts at each step, conversion/drop-off rates, and path performance over time.",
        expected_context=["Journey's reporting dashboard shows step-by-step customer counts and conversion metrics for each journey."],
        metadata={"category": "journey", "difficulty": "easy", "test_type": "answer_present_in_kb"},
    ),
    MaxAITestCase(
        question="What is the maximum number of active journeys supported per tenant in a specific Journey deployment?",
        expected_answer="I don't have that information available.",
        expected_context=[],
        metadata={"category": "journey", "difficulty": "hard", "test_type": "answer_not_in_kb"},
    ),
    MaxAITestCase(
        question="Which year did Unica Journey climb Mount Everest as part of a marketing stunt?",
        expected_answer="Unica Journey has not climbed Mount Everest; it is customer journey orchestration software, not a physical entity.",
        expected_context=["Unica Journey is a software product for orchestrating customer journeys; no such stunt is documented."],
        metadata={"category": "journey", "difficulty": "hard", "test_type": "hallucination_probe"},
    ),
    MaxAITestCase(
        question="Totally unrelated, but I love hiking — anyway, how do I pause a live journey without deleting it?",
        expected_answer="Use the journey's pause/deactivate control to stop new enrollments and step processing while keeping the journey definition intact.",
        expected_context=["Journeys can be paused/deactivated, which stops processing while preserving the journey configuration for later reactivation."],
        metadata={"category": "journey", "difficulty": "medium", "test_type": "irrelevant_or_misleading"},
    ),
    MaxAITestCase(
        question="Why did the customer not move to the next step?",
        expected_answer="I don't have enough information to answer that — please share the journey name, the step involved, and the customer's entry conditions.",
        expected_context=[],
        metadata={"category": "journey", "difficulty": "medium", "test_type": "incomplete_information"},
    ),
    MaxAITestCase(
        question="What is the exact data-retention period guaranteed for this customer's Journey analytics contract?",
        expected_answer="I don't have enough information to answer that; retention terms are contract-specific and not documented in this knowledge base.",
        expected_context=[],
        metadata={"category": "journey", "difficulty": "hard", "test_type": "insufficient_information"},
    ),
]
