"""Local Mistral model wired up as a DeepEval judge (LLM-as-a-judge)."""

from __future__ import annotations

from typing import Optional, Type
from urllib.parse import urlparse

from openai import OpenAI
from pydantic import BaseModel
import requests

from deepeval.models import DeepEvalBaseLLM

from .config import MistralJudgeConfig


class MistralJudge(DeepEvalBaseLLM):
    """DeepEval judge backed by a locally-hosted Mistral model.

    Works with any OpenAI-compatible local server (Ollama, LM Studio, vLLM,
    text-generation-webui). Configure via MISTRAL_MODEL / MISTRAL_BASE_URL /
    MISTRAL_API_KEY / MISTRAL_TEMPERATURE env vars — see .env.example.
    """

    def __init__(self, config: MistralJudgeConfig | None = None):
        self.config = config or MistralJudgeConfig.from_env()
        self.client = OpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url,
            timeout=120.0,
        )

    def _ollama_url(self) -> str | None:
        parsed = urlparse(self.config.base_url)
        if parsed.hostname not in {"localhost", "127.0.0.1"} or parsed.port != 11434:
            return None
        return f"{parsed.scheme}://{parsed.netloc}/api/chat"

    def load_model(self):
        return self.client

    def generate(self, prompt: str, schema: Optional[Type[BaseModel]] = None):
        """Generate a completion, constrained to `schema` when DeepEval asks.

        DeepEval passes a pydantic schema for metrics that need structured
        output. Without schema-constrained decoding, smaller local models
        return prose or malformed JSON and the metric fails with "outputted an
        invalid JSON".
        """
        ollama_url = self._ollama_url()
        if ollama_url is not None:
            payload = {
                "model": self.config.model_name,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "think": False,
                "options": {"temperature": self.config.temperature},
            }
            if schema is not None:
                payload["format"] = schema.model_json_schema()

            response = requests.post(ollama_url, json=payload, timeout=120.0)
            response.raise_for_status()
            content = response.json()["message"]["content"]
            return schema.model_validate_json(content) if schema is not None else content

        kwargs = {}
        if schema is not None:
            kwargs["response_format"] = {
                "type": "json_schema",
                "json_schema": {
                    "name": schema.__name__,
                    "schema": schema.model_json_schema(),
                    "strict": True,
                },
            }

        response = self.client.chat.completions.create(
            model=self.config.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.config.temperature,
            **kwargs,
        )
        content = response.choices[0].message.content or ""
        return schema.model_validate_json(content) if schema is not None else content

    async def a_generate(self, prompt: str, schema: Optional[Type[BaseModel]] = None):
        # Local model servers used here are called synchronously; DeepEval
        # only requires this coroutine to exist and return the same result.
        return self.generate(prompt, schema=schema)

    def get_model_name(self) -> str:
        return f"Local Mistral ({self.config.model_name} @ {self.config.base_url})"
