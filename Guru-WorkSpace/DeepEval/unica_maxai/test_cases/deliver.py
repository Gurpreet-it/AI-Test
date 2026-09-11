"""Test cases for HCL Unica Deliver (email/SMS/push message execution).

TEMPLATES: written around Deliver's general concepts (document composer,
mailing lists, bounce/suppression handling, delivery scheduling). Review and
correct expected_answer / expected_context against your real MaxAI knowledge
base before treating scores as meaningful.
"""

from __future__ import annotations

from typing import List

from ..models import MaxAITestCase

DELIVER_TEST_CASES: List[MaxAITestCase] = [
    MaxAITestCase(
        question="What is Unica Deliver used for?",
        expected_answer="Unica Deliver executes and sends personalized email (and other digital) messages to the audiences selected by Campaign flowcharts.",
        expected_context=["Unica Deliver handles message composition, personalization, and delivery of emails generated from Campaign mailing flowcharts."],
        metadata={"category": "deliver", "difficulty": "easy", "test_type": "simple_factual"},
    ),
    MaxAITestCase(
        question="How do I create a new email document, personalize it with a customer field, and then link it to a mailing flowchart?",
        expected_answer="Create the document in Deliver's document composer, insert the personalization field from the available data fields, then reference the document from a Mail List process in the Campaign flowchart.",
        expected_context=[
            "Deliver's document composer is used to design email templates and insert personalization tags.",
            "A flowchart's Mail List/Deliver process links a document to the selected audience for sending.",
        ],
        metadata={"category": "deliver", "difficulty": "medium", "test_type": "multi_step"},
    ),
    MaxAITestCase(
        question="What is the difference between a hard bounce and a soft bounce in Deliver, and which one triggers suppression from future sends?",
        expected_answer="A hard bounce is a permanent delivery failure (e.g. invalid address) while a soft bounce is temporary (e.g. mailbox full); hard bounces typically trigger suppression from future sends.",
        expected_context=[
            "Hard bounces indicate a permanent failure such as a non-existent email address.",
            "Deliver's suppression list logic can automatically exclude addresses with repeated hard bounces from future mailings.",
        ],
        metadata={"category": "deliver", "difficulty": "medium", "test_type": "multi_document"},
    ),
    MaxAITestCase(
        question="Can Deliver just keep sending the newsletter every week on its own once it's set up?",
        expected_answer="Yes — once the mailing flowchart is scheduled with a recurring pattern, Deliver will send the newsletter automatically each week.",
        expected_context=["Mailing flowcharts inherit Campaign's scheduling capability, supporting recurring runs without manual intervention."],
        metadata={"category": "deliver", "difficulty": "medium", "test_type": "ambiguous_wording"},
    ),
    MaxAITestCase(
        question="What tracking metrics does Deliver capture for sent emails?",
        expected_answer="Deliver captures metrics such as opens, clicks, bounces, unsubscribes, and delivery status for each sent email.",
        expected_context=["Deliver's tracking captures open rates, click-through rates, bounce rates, and unsubscribe events per mailing."],
        metadata={"category": "deliver", "difficulty": "easy", "test_type": "answer_present_in_kb"},
    ),
    MaxAITestCase(
        question="What is the maximum sustained emails-per-hour throughput for a specific Deliver server configuration?",
        expected_answer="I don't have that information available.",
        expected_context=[],
        metadata={"category": "deliver", "difficulty": "hard", "test_type": "answer_not_in_kb"},
    ),
    MaxAITestCase(
        question="Which year did Unica Deliver deliver its billionth pizza order?",
        expected_answer="Unica Deliver has never delivered pizza orders; it is an email/message delivery product for marketing campaigns.",
        expected_context=["Unica Deliver is a marketing message delivery product, unrelated to food delivery."],
        metadata={"category": "deliver", "difficulty": "hard", "test_type": "hallucination_probe"},
    ),
    MaxAITestCase(
        question="Side note, I don't like spam calls — anyway, how do I set up an unsubscribe link in a Deliver email template?",
        expected_answer="Insert the unsubscribe personalization tag/link provided by Deliver into the email template so recipients can opt out.",
        expected_context=["Deliver document templates support an unsubscribe link tag that generates a working opt-out link per recipient."],
        metadata={"category": "deliver", "difficulty": "medium", "test_type": "irrelevant_or_misleading"},
    ),
    MaxAITestCase(
        question="Why didn't the email go out?",
        expected_answer="I don't have enough information to answer that — please share the mailing/flowchart name and any error shown in the run log.",
        expected_context=[],
        metadata={"category": "deliver", "difficulty": "medium", "test_type": "incomplete_information"},
    ),
    MaxAITestCase(
        question="What is the exact deliverability SLA guaranteed for this customer's Deliver contract with their ESP?",
        expected_answer="I don't have enough information to answer that; SLA terms are contract-specific and not documented in this knowledge base.",
        expected_context=[],
        metadata={"category": "deliver", "difficulty": "hard", "test_type": "insufficient_information"},
    ),
]
