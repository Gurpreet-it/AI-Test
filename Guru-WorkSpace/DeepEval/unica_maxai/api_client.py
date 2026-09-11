"""Thin HTTP client for the Unica MaxAI orchestrator query endpoint."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, List, Optional

import requests

from .config import MaxAIAPIConfig

# Keys we try, in order, to find the generated answer / retrieved context
# inside whatever JSON shape the API returns. Kept as a list (rather than a
# single assumed key) because the exact response schema wasn't specified.
_ANSWER_KEYS = ("answer", "response", "result", "output", "text")
_CONTEXT_KEYS = ("context", "contexts", "retrieved_context", "retrieval_context", "sources", "documents", "chunks")


@dataclass
class MaxAIResult:
    """Outcome of a single question sent to the MaxAI API."""

    question: str
    answer: Optional[str] = None
    retrieved_context: Optional[List[str]] = None
    raw_response: Optional[Any] = None
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.error is None and self.answer is not None


def _find_first(payload: Any, keys: tuple) -> Optional[Any]:
    """Look for the first matching key at the top level or one level deep."""
    if not isinstance(payload, dict):
        return None
    for key in keys:
        if key in payload and payload[key]:
            return payload[key]
    # One level deep (e.g. {"data": {"answer": "..."}})
    for value in payload.values():
        if isinstance(value, dict):
            for key in keys:
                if key in value and value[key]:
                    return value[key]
    return None


def _coerce_context(raw: Any) -> Optional[List[str]]:
    if raw is None:
        return None
    if isinstance(raw, str):
        return [raw]
    if isinstance(raw, list):
        out = []
        for item in raw:
            if isinstance(item, str):
                out.append(item)
            elif isinstance(item, dict):
                # Common shapes: {"text": "..."} or {"content": "..."}
                out.append(str(item.get("text") or item.get("content") or item))
            else:
                out.append(str(item))
        return out or None
    return None


class MaxAIClient:
    """Sends questions to the MaxAI orchestrator and normalizes the response.

    Auth chain: platform token (m_tokenId) -> MaxAI login (MAXAISESSIONID)
    -> orchestrator query.
    """

    SESSION_COOKIE_NAME = "MAXAISESSIONID"
    AUTH_ERROR_STATUSES = (401, 403)
    AUTH_RETRIES = 1

    def __init__(self, config: Optional[MaxAIAPIConfig] = None):
        self.config = config or MaxAIAPIConfig.from_env()
        self.token_id: Optional[str] = self.config.token_id or None
        self.session_id: Optional[str] = None

    def fetch_token(self) -> str:
        """Get an m_tokenId from the Unica platform authentication endpoint."""
        headers = {
            "Accept": "application/json",
            "m_user_name": self.config.username,
            "m_user_password": self.config.password,
            "sso_destapp": self.config.sso_destapp,
        }
        # Credentials are sent both as query params and headers, as the
        # platform accepts either depending on deployment.
        params = {
            "m_user_name": self.config.username,
            "m_user_password": self.config.password,
        }

        response = requests.post(
            self.config.token_url,
            headers=headers,
            params=params,
            timeout=self.config.timeout_seconds,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Token request returned HTTP {response.status_code}: {response.text[:500]}")

        try:
            payload = response.json()
        except ValueError:
            raise RuntimeError(f"Token response was not JSON: {response.text[:500]}")

        token_id = payload.get("m_tokenId") if isinstance(payload, dict) else None
        if not token_id:
            raise RuntimeError("Token response did not contain an m_tokenId field")

        self.token_id = token_id
        return token_id

    def _post_login(self, token_id: str):
        return requests.post(
            self.config.login_url,
            headers={
                "Accept": "application/json",
                "m_tokenId": token_id,
                "sso_destapp": self.config.sso_destapp,
                "api-auth-mode": self.config.auth_mode,
            },
            timeout=self.config.timeout_seconds,
        )

    def login(self) -> str:
        """Exchange the platform token for a MAXAISESSIONID session cookie."""
        reused_token = self.token_id is not None
        response = self._post_login(self.token_id or self.fetch_token())

        # A reused token may have expired: get a fresh one and try again.
        if response.status_code in self.AUTH_ERROR_STATUSES and reused_token:
            response = self._post_login(self.fetch_token())

        if response.status_code >= 400:
            raise RuntimeError(f"Login returned HTTP {response.status_code}: {response.text[:500]}")

        session_id = response.cookies.get(self.SESSION_COOKIE_NAME)
        if not session_id:
            raise RuntimeError(f"Login response did not contain a {self.SESSION_COOKIE_NAME} cookie")

        self.session_id = session_id
        return session_id

    def _ensure_session_id(self) -> str:
        if self.session_id is None:
            self.login()
        return self.session_id

    def _invalidate_auth(self) -> None:
        """Drop the cached token/session so the next call re-authenticates."""
        self.token_id = None
        self.session_id = None

    def _query_headers(self, session_id: str) -> dict:
        return {
            "Accept": "application/json",
            "m_user_name": self.config.username,
            "m_tokenId": self.token_id,
            "api_auth_mode": self.config.auth_mode,
            "sso_destapp": self.config.sso_destapp,
            "Cookie": f"{self.SESSION_COOKIE_NAME}={session_id}",
        }

    def ask(self, question: str) -> MaxAIResult:
        # `question` is a plain text field, not a file. requests only sends
        # multipart/form-data (as required by the API) when at least one
        # part is passed via `files=`; the (None, value) form does exactly
        # that for a non-file text field.
        files = {"question": (None, question)}

        for attempt in range(self.AUTH_RETRIES + 1):
            try:
                session_id = self._ensure_session_id()
            except RuntimeError as exc:
                return MaxAIResult(question=question, error=str(exc))
            except requests.exceptions.RequestException as exc:
                return MaxAIResult(question=question, error=f"Authentication request failed: {exc}")

            try:
                response = requests.post(
                    self.config.url,
                    headers=self._query_headers(session_id),
                    files=files,
                    timeout=self.config.timeout_seconds,
                )
            except requests.exceptions.Timeout:
                return MaxAIResult(question=question, error=f"Request timed out after {self.config.timeout_seconds}s")
            except requests.exceptions.RequestException as exc:
                return MaxAIResult(question=question, error=f"Request failed: {exc}")

            # An expired session/token shows up as 401/403: re-authenticate once.
            if response.status_code in self.AUTH_ERROR_STATUSES and attempt < self.AUTH_RETRIES:
                self._invalidate_auth()
                continue
            break

        if response.status_code >= 400:
            return MaxAIResult(
                question=question,
                error=f"API returned HTTP {response.status_code}: {response.text[:500]}",
            )

        try:
            payload = response.json()
        except ValueError:
            return MaxAIResult(question=question, error=f"Non-JSON response: {response.text[:500]}")

        answer = _find_first(payload, _ANSWER_KEYS)
        if answer is None:
            return MaxAIResult(
                question=question,
                raw_response=payload,
                error="Could not locate an answer field in the API response",
            )

        context = _coerce_context(_find_first(payload, _CONTEXT_KEYS))

        return MaxAIResult(
            question=question,
            answer=str(answer),
            retrieved_context=context,
            raw_response=payload,
        )
