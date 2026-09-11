"""Shared data model for MaxAI test cases (kept separate from the test_cases
package so both the aggregator and individual product files can import it
without circular imports).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class MaxAITestCase:
    question: str
    expected_answer: Optional[str] = None
    expected_context: List[str] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)
