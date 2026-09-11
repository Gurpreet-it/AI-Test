"""Centralized, environment-driven configuration.

Nothing here is hard-coded: secrets and endpoints come from environment
variables (populated via a local `.env.local` file that is git-ignored).
See `.env.example` in this folder for the full list of supported variables.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Load .env.local sitting next to this package (DeepEval/.env.local) so the
# suite works the same way whether invoked via pytest, deepeval CLI, or the
# standalone runner script.
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")


def _get_float(name: str, default: float) -> float:
    raw = os.environ.get(name)
    return float(raw) if raw else default


def _get_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return int(raw) if raw else default


def _base_url(query_url: str) -> str:
    marker = "/maxai/"
    return query_url.split(marker)[0] if marker in query_url else query_url.rstrip("/")


def _default_login_url(query_url: str) -> str:
    """Derive `<host>/maxai/platform/login` from the orchestrator query URL."""
    return f"{_base_url(query_url)}/maxai/platform/login"


def _default_token_url(query_url: str) -> str:
    """Derive the Unica platform authentication URL from the query URL."""
    return f"{_base_url(query_url)}/unica/api/manager/authentication/login"


@dataclass(frozen=True)
class MaxAIAPIConfig:
    url: str
    username: str
    password: str
    timeout_seconds: int
    login_url: str = ""
    token_url: str = ""
    token_id: str = ""
    sso_destapp: str = "AION"
    auth_mode: str = "manager"

    @classmethod
    def from_env(cls) -> "MaxAIAPIConfig":
        url = os.environ.get(
            "MAXAI_API_URL",
            "https://unicatango.hxun.now.hclsoftware.cloud/maxai/orchestrator/v1/query/form",
        )
        username = os.environ.get("MAXAI_USERNAME", "")
        password = os.environ.get("MAXAI_PASSWORD", "")
        if not username or not password:
            raise RuntimeError(
                "MAXAI_USERNAME and MAXAI_PASSWORD must be set (see .env.example). "
                "Refusing to run with empty credentials."
            )
        return cls(
            url=url,
            username=username,
            password=password,
            timeout_seconds=_get_int("MAXAI_TIMEOUT_SECONDS", 30),
            login_url=os.environ.get("MAXAI_LOGIN_URL") or _default_login_url(url),
            token_url=os.environ.get("MAXAI_TOKEN_URL") or _default_token_url(url),
            token_id=os.environ.get("MAXAI_TOKEN_ID", ""),
            sso_destapp=os.environ.get("MAXAI_SSO_DESTAPP", "AION"),
            auth_mode=os.environ.get("MAXAI_AUTH_MODE", "manager"),
        )


@dataclass(frozen=True)
class MistralJudgeConfig:
    """Config for the local Mistral model used as the DeepEval judge.

    Points at any OpenAI-compatible local server (Ollama, LM Studio,
    text-generation-webui, vLLM, etc). Defaults assume Ollama running
    `mistral` locally.
    """

    model_name: str
    base_url: str
    api_key: str
    temperature: float

    @classmethod
    def from_env(cls) -> "MistralJudgeConfig":
        return cls(
            model_name=os.environ.get("MISTRAL_MODEL", "qwen-128k:latest"),
            base_url=os.environ.get("MISTRAL_BASE_URL", "http://localhost:11434/v1"),
            # Ollama/most local servers ignore the key but the OpenAI SDK
            # requires a non-empty string.
            api_key=os.environ.get("MISTRAL_API_KEY", "not-needed"),
            temperature=_get_float("MISTRAL_TEMPERATURE", 0.0),
        )


@dataclass(frozen=True)
class MetricThresholds:
    contextual_precision: float
    contextual_recall: float
    contextual_relevancy: float
    faithfulness: float
    answer_relevancy: float
    hallucination: float  # DeepEval scores factual alignment: higher is better
    correctness: float

    @classmethod
    def from_env(cls) -> "MetricThresholds":
        return cls(
            contextual_precision=_get_float("THRESH_CONTEXTUAL_PRECISION", 0.7),
            contextual_recall=_get_float("THRESH_CONTEXTUAL_RECALL", 0.7),
            contextual_relevancy=_get_float("THRESH_CONTEXTUAL_RELEVANCY", 0.7),
            faithfulness=_get_float("THRESH_FAITHFULNESS", 0.7),
            answer_relevancy=_get_float("THRESH_ANSWER_RELEVANCY", 0.7),
            hallucination=_get_float("THRESH_HALLUCINATION", 0.8),
            correctness=_get_float("THRESH_CORRECTNESS", 0.7),
        )
