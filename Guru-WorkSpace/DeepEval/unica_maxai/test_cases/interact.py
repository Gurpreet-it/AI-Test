"""Test cases for HCL Unica Interact (real-time interaction management).

TEMPLATES: written around Interact's general concepts (interactive channels,
treatments, learning modes, zones). Review/correct expected_answer and
expected_context against your real MaxAI knowledge base before treating
scores as meaningful.
"""

from __future__ import annotations

from typing import List

from ..models import MaxAITestCase

INTERACT_TEST_CASES: List[MaxAITestCase] = [
    MaxAITestCase(
        question="What all cache management we support in Interact?",
        expected_answer="Unica Interact supports these cache management solutions by default:\n"
                        "Ignite (memory-centric distributed caching solution included with Interact)\n"
                        "EHCache (open-source caching solution included with every Interact installation)\n"
                        "Redis (open-source in-memory data structure store that can be used as a database, cache, message broker, and streaming engine)",
        expected_context=["Interact cache managemen Ignite EHCache and Redis , details will mention inInteract Tuning Guide "],
        metadata={"category": "interact", "difficulty": "easy", "test_type": "simple_factual"},
    ),
    MaxAITestCase(
        question="How do I set up a new interactive channel, add a zone to it, and enable learning mode?",
        expected_answer="To set up a new Unica Interact interactive channel, add a zone, and enable learning mode, follow these steps.\n"
                        "A) Create a new interactive channel\n"
                        "Go to Interact > Interactive channels.\n"
                        "On All interactive channels, click the Add interactive channel icon.\n"
                        "In the Interactive channel summary dialog:\n"
                        "Enter Name and Description.\n"
                        "Select the Security policy (you cannot change the security policy after creation).\n"
                        "(Optional) Select a parent interactive channel if you want to reuse marketing objects.\n"
                        "Select one or more Runtime server groups.\n"
                        "Select the Production runtime server group.\n"
                        "Set Maximum # of times to show any offer during a single visit.\n"
                        "Click Save and return.\n"
                        "B) Add a zone to the interactive channel\n"

                        "Open the interactive channel and go to the Interaction points tab.\n"
                        "Click the Add zone icon.\n"
                        "In the Add/edit Zone dialog:\n"
                        "Enter a Name and Description.\n"
                        "(Optional) Click Advanced features to configure additional settings (including learning mode options for the zone).\n"
                        "Click Save and return.\n"
                        "C) Enable learning mode (for the zone)\n"
                        "When you’re adding/editing the zone, use Advanced features → Learning mode and choose one of the available settings:\n"

                        "Inherit from interactive channel (default)\n"
                        "Use marketer’s scores only\n"
                        "Use custom learning model (select from the drop-down; if no custom learning models exist for the interactive channel, this option is unavailable)\n"
                        "You can also add zones (and add interaction points under them) from the Strategy tab:\n"

                        "Go to the interactive channel’s Strategy tab and click Add/Modify Rules.\n"
                        "In the Zone area, click Add Zone.\n"
                        "Provide Zone Info and (optionally) add Interaction Points (including a Default String to return).\n"
                        "Under Learning Mode, select:\n"
                        "Inherit from interactive channel, Use marketer’s scores only, or Use custom learning model\n"
                        "Click Add New Zone.\n"
                        "If you want “custom learning model” behavior, you typically need to create/enable a learning model for the interactive channel (via the Self learning tab) and click Enable for that model.",
        expected_context=[
                        "To set up a new Unica Interact interactive channel, add a zone, and enable learning mode, follow these steps.\n"
                        "A) Create a new interactive channel\n"
                        "Go to Interact > Interactive channels.\n"
                        "On All interactive channels, click the Add interactive channel icon.\n"
                        "In the Interactive channel summary dialog:\n"
                        "Enter Name and Description.\n"
                        "Select the Security policy (you cannot change the security policy after creation).\n"
                        "(Optional) Select a parent interactive channel if you want to reuse marketing objects.\n"
                        "Select one or more Runtime server groups.\n"
                        "Select the Production runtime server group.\n"
                        "Set Maximum # of times to show any offer during a single visit.\n"
                        "Click Save and return.\n"
                        "B) Add a zone to the interactive channel\n"

                        "Open the interactive channel and go to the Interaction points tab.\n"
                        "Click the Add zone icon.\n"
                        "In the Add/edit Zone dialog:\n"
                        "Enter a Name and Description.\n"
                        "(Optional) Click Advanced features to configure additional settings (including learning mode options for the zone).\n"
                        "Click Save and return.\n"
                        "C) Enable learning mode (for the zone)\n"
                        "When you’re adding/editing the zone, use Advanced features → Learning mode and choose one of the available settings:\n"

                        "Inherit from interactive channel (default)\n"
                        "Use marketer’s scores only\n"
                        "Use custom learning model (select from the drop-down; if no custom learning models exist for the interactive channel, this option is unavailable)\n"
                        "You can also add zones (and add interaction points under them) from the Strategy tab:\n"

                        "Go to the interactive channel’s Strategy tab and click Add/Modify Rules.\n"
                        "In the Zone area, click Add Zone.\n"
                        "Provide Zone Info and (optionally) add Interaction Points (including a Default String to return).\n"
                        "Under Learning Mode, select:\n"
                        "Inherit from interactive channel, Use marketer’s scores only, or Use custom learning model\n"
                        "Click Add New Zone.\n"
                        "If you want “custom learning model” behavior, you typically need to create/enable a learning model for the interactive channel (via the Self learning tab) and click Enable for that model."
        ],
        metadata={"category": "interact", "difficulty": "medium", "test_type": "multi_step"},
    ),
    MaxAITestCase(
        question="What is the difference between a treatment rule and an eligibility rule in Interact, and which one determines the final offer ranking?",
        expected_answer="In Unica Interact, a treatment rule is the primary rule object used to decide which offers are "
                        "candidates for a visitor and interaction point (zone), while an eligibility rule/expression is the "
                        "eligibility criterion evaluated (often at runtime) to decide whether a treatment rule (and its "
                        "offer/offer list) is eligible to participate.\n"
                        "\n"
                        "Treatment rule (what it is)\n"
                        "The main guideline Interact uses to present offers.\n"
                        "Contains three required elements: smart segment, zone (with interaction points), and an offer or offer list.\n"
                        "Can also include a marketing score (default 50) to weight offers, and optional features such as "
                        "suppression, score overrides, learning, etc.\n"
                        "Interact uses treatment rules as the first-level method to determine which offers are eligible for a visitor.\n"
                        "(Example: you can assign multiple offers to the same segment/zone via multiple treatment rules.)\n"
                        "\n"
                        "Eligibility rule / eligibility expression (what it does)\n"
                        "Eligibility determines whether an offer (via its treatment rule) is eligible at runtime.\n"
                        "An offer is only eligible if it is within its effective period (Effective to Expiration date) and/or an "
                        "expression evaluates to true at runtime.\n"
                        "You can write eligibility expressions directly in treatment rules (for example, based on offer attributes "
                        "like offer.dynamic.ownProductX='yes'), to control targeting outside interactive flowcharts.\n"
                        "\n"
                        "Which determines the final offer ranking?\n"
                        "Final ranking is driven by score/arbitration after eligibility filtering, primarily using the marketing "
                        "score (and any configured dynamic scoring/learning/overrides).\n"
                        "Specifically: Interact calculates a score for each eligible treatment rule/offer, and when multiple offers "
                        "are available, it uses the marketing score to determine which offer to recommend (higher score wins). "
                        "If scores tie, Interact breaks the tie via random selection (configurable).",
        expected_context=[
            "Eligibility rules filter which offers a visitor qualifies for.",
            "Arbitration (treatment) logic ranks eligible offers using scores, priorities, or self-learning models to pick the final offer.",
        ],
        metadata={"category": "interact", "difficulty": "medium", "test_type": "multi_document"},
    ),
]
