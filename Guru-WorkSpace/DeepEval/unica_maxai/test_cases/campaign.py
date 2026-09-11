"""Test cases for HCL Unica Campaign.

TEMPLATES: written around Campaign's general concepts (flowcharts, segments,
offers, scheduling). Review/correct expected_answer and expected_context
against your real MaxAI knowledge base before treating scores as meaningful.
"""

from __future__ import annotations

from typing import List

from ..models import MaxAITestCase

CAMPAIGN_TEST_CASES: List[MaxAITestCase] = [
    MaxAITestCase(
        question="What is Unica Campaign used for?",
        expected_answer="Unica Campaign is used to design, execute, and track multi-step outbound marketing campaigns using flowcharts.",
        expected_context=["Unica Campaign lets marketers build flowchart-based campaigns to select audiences and execute marketing actions."],
        metadata={"category": "campaign", "difficulty": "easy", "test_type": "simple_factual"},
    ),
    MaxAITestCase(
        question="How do I create a new campaign, add a segment to it, and then schedule it to run next week?",
        expected_answer="Create the campaign in the campaign designer, add a segment/select process in the flowchart to bring in the audience, then set a schedule with a start date next week.",
        expected_context=[
            "Campaigns are built using the flowchart editor with processes such as Select, Segment, and Mail/Call List.",
            "A campaign's Schedule tab controls when and how often it runs.",
        ],
        metadata={"category": "campaign", "difficulty": "medium", "test_type": "multi_step"},
    ),
    MaxAITestCase(
        question="What is the difference between a static segment and a dynamic segment in Campaign, and which offer list process would I use to attach an offer?",
        expected_answer="A static segment is a fixed audience list, while a dynamic segment re-evaluates its rules automatically; offers are attached to a flowchart using the Offer or Mail List process.",
        expected_context=[
            "Static segments do not change once created; dynamic segments re-run their selection logic on each execution.",
            "The Offer process in a flowchart assigns one or more offers to the audience passing through it.",
        ],
        metadata={"category": "campaign", "difficulty": "medium", "test_type": "multi_document"},
    ),
    MaxAITestCase(
        question="Can I make it so the campaign just runs on its own every week without me clicking anything?",
        expected_answer="Yes — a campaign's flowchart can be scheduled with a recurring run pattern so it executes automatically every week.",
        expected_context=["Campaign flowcharts support recurring schedules (daily/weekly/monthly) for unattended execution."],
        metadata={"category": "campaign", "difficulty": "medium", "test_type": "ambiguous_wording"},
    ),
    MaxAITestCase(
        question="What security policies control who can edit a campaign in Unica Campaign?",
        expected_answer="Unica Campaign uses security policies and user roles/permissions to control who can view, edit, execute, or approve campaigns.",
        expected_context=["Security policies in Campaign define folder-level and object-level permissions tied to user roles."],
        metadata={"category": "campaign", "difficulty": "easy", "test_type": "answer_present_in_kb"},
    ),
    MaxAITestCase(
        question="What is the maximum number of concurrent flowchart runs supported on an 8-core Campaign server?",
        expected_answer="I don't have that information available.",
        expected_context=[],
        metadata={"category": "campaign", "difficulty": "hard", "test_type": "answer_not_in_kb"},
    ),
    MaxAITestCase(
        question="Which year did Unica Campaign win an Academy Award for its flowchart engine?",
        expected_answer="Unica Campaign has not won an Academy Award; that award is unrelated to marketing campaign software.",
        expected_context=["Unica Campaign is a marketing campaign management product with no record of an Academy Award."],
        metadata={"category": "campaign", "difficulty": "hard", "test_type": "hallucination_probe"},
    ),
    MaxAITestCase(
        question="My favorite color is teal, by the way — how do I export a campaign's target audience to CSV?",
        expected_answer="Use the audience/segment export option on the relevant process box or segment view to download the list as CSV.",
        expected_context=["Campaign supports exporting select/segment output lists to CSV from the flowchart process configuration."],
        metadata={"category": "campaign", "difficulty": "medium", "test_type": "irrelevant_or_misleading"},
    ),
    MaxAITestCase(
        question="How do I fix the flowchart error?",
        expected_answer="I don't have enough information to answer that — please share the specific error message or process box that's failing.",
        expected_context=[],
        metadata={"category": "campaign", "difficulty": "medium", "test_type": "incomplete_information"},
    ),
    MaxAITestCase(
        question="What is the exact response-time SLA guaranteed for this customer's Campaign flowchart execution?",
        expected_answer="I don't have enough information to answer that; SLA terms are contract-specific and not documented in this knowledge base.",
        expected_context=[],
        metadata={"category": "campaign", "difficulty": "hard", "test_type": "insufficient_information"},
    ),
]
