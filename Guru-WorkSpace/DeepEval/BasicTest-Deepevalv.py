# Exercise 1 (Basic): Answer Relevancy
# Level Basic : chatbot anwsers

# Exercise 1 (Basic): Answer Relevancy & Hallucination Detection
# Level Basic : chatbot anwsers

# Goal:
#     Learn the two most fundamental LLM evaluation metrics:
#     1. Answer Relevancy  — Does the chatbot answer the question asked?



# Setup: DeepEval needs a "judge" LLM to score the output. Pick one.
    # Groq (cheap, OpenAI-compatible endpoint -> registered as a local model):
    #   deepeval set-local-model --model openai/gpt-oss-120b \
    #       --base-url "https://api.groq.com/openai/v1" --format json --prompt-api-key
    # OpenAI:
    #   export OPENAI_API_KEY=your_key_here
    #   deepeval set-openai --model gpt-4o-mini
    # Note: `deepeval set-grok` is xAI's Grok, NOT Groq.com.
    # Run: pytest test_01_Anwser_Relevancy.py

import asyncio

from pathlib import Path

from deepeval.test_case import LLMTestCase
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.models import DeepEvalBaseLLM
from deepeval import evaluate
from dotenv import load_dotenv
from openai import OpenAI
import os


asyncio.set_event_loop(asyncio.new_event_loop())
load_dotenv(Path(__file__).resolve().parent / ".env.local")


class GroqJudge(DeepEvalBaseLLM):
    def __init__(self):
        self.client = OpenAI(
            api_key=os.environ["GROQ_API_KEY"],
            base_url="https://api.groq.com/openai/v1",
        )

    def load_model(self):
        return self.client

    def generate(self, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content or ""

    async def a_generate(self, prompt: str) -> str:
        return self.generate(prompt)

    def get_model_name(self) -> str:
        return "Groq openai/gpt-oss-120b"

def test_hello_world():

    test = LLMTestCase(
        input="What is 2+2?",
        actual_output="4",
        expected_output="4",
        context=["Basic arithmetice perform and give result"]
    )

    #metric = [AnswerRelevancyMetric(threshold=0.9, model=GroqJudge())]
    #assert_test(test, metric)
    evaluate(test_cases=[test], 
            metrics=[AnswerRelevancyMetric(threshold=0.9, model=GroqJudge())])