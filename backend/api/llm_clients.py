"""Unified async LLM client for 15 providers.

Every provider returns a plain text string. Errors raise `LLMAPIError`.
Provider-specific quirks (header names, response paths) are isolated
inside small functions; OpenAI-compatible providers reuse `_openai_compat`.
"""
from __future__ import annotations

import logging
import time

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from ..config import settings

logger = logging.getLogger(__name__)


class LLMAPIError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# Shared HTTP client
# ---------------------------------------------------------------------------

_client: httpx.AsyncClient | None = None


def _http() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=settings.LLM_TIMEOUT)
    return _client


async def aclose_http() -> None:
    """Close the shared HTTP client (called on FastAPI shutdown)."""
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None


_retry = retry(
    stop=stop_after_attempt(settings.LLM_RETRY_ATTEMPTS),
    wait=wait_exponential(
        multiplier=1,
        min=settings.LLM_RETRY_MIN_WAIT,
        max=settings.LLM_RETRY_MAX_WAIT,
    ),
    reraise=True,
)


def _wrap_error(provider: str, exc: Exception) -> LLMAPIError:
    return LLMAPIError(f"{provider}: {exc}")


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------


@_retry
async def _openai_compat(base_url: str, api_key: str, model: str, prompt: str) -> str:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
    }
    started = time.time()
    try:
        r = await _http().post(
            f"{base_url}/chat/completions", headers=headers, json=payload
        )
        r.raise_for_status()
        logger.info("LLM %s/%s in %.2fs", base_url, model, time.time() - started)
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error("LLM error %s/%s: %s", base_url, model, e)
        raise _wrap_error(base_url, e) from e


async def query_openai(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.openai.com/v1", api_key, model, prompt)


async def query_groq(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.groq.com/openai/v1", api_key, model, prompt)


async def query_perplexity(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.perplexity.ai", api_key, model, prompt)


async def query_together(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.together.xyz/v1", api_key, model, prompt)


async def query_xai(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.x.ai/v1", api_key, model, prompt)


async def query_deepseek(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.deepseek.com", api_key, model, prompt)


async def query_qwen(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat(
        "https://dashscope.aliyuncs.com/compatible-mode/v1", api_key, model, prompt
    )


async def query_glm(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://open.bigmodel.cn/api/paas/v4", api_key, model, prompt)


async def query_minimax(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.minimax.chat/v1", api_key, model, prompt)


async def query_kimi(api_key: str, model: str, prompt: str) -> str:
    return await _openai_compat("https://api.moonshot.cn/v1", api_key, model, prompt)


@_retry
async def query_anthropic(api_key: str, model: str, prompt: str) -> str:
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 4096,
        "messages": [{"role": "user", "content": prompt}],
    }
    try:
        r = await _http().post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["content"][0]["text"]
    except Exception as e:
        logger.error("Anthropic error: %s", e)
        raise _wrap_error("anthropic", e) from e


@_retry
async def query_gemini(api_key: str, model: str, prompt: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        r = await _http().post(url, params={"key": api_key}, json=payload)
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        logger.error("Gemini error: %s", e)
        raise _wrap_error("gemini", e) from e


@_retry
async def query_mistral(api_key: str, model: str, prompt: str) -> str:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 4096,
    }
    try:
        r = await _http().post("https://api.mistral.ai/v1/chat/completions", headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.error("Mistral error: %s", e)
        raise _wrap_error("mistral", e) from e


@_retry
async def query_cohere(api_key: str, model: str, prompt: str) -> str:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": model, "message": prompt, "max_tokens": 4096}
    try:
        r = await _http().post("https://api.cohere.ai/v1/chat", headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["text"]
    except Exception as e:
        logger.error("Cohere error: %s", e)
        raise _wrap_error("cohere", e) from e


@_retry
async def query_ollama(api_key: str, model: str, prompt: str) -> str:
    # `api_key` is reused as the Ollama base URL.
    base_url = (api_key or "http://localhost:11434").strip().rstrip("/")
    payload = {"model": model, "prompt": prompt, "stream": False}
    try:
        r = await _http().post(f"{base_url}/api/generate", json=payload)
        r.raise_for_status()
        return r.json()["response"]
    except Exception as e:
        logger.error("Ollama error: %s", e)
        raise _wrap_error("ollama", e) from e


# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

PROVIDERS = {
    "openai":     query_openai,
    "anthropic":  query_anthropic,
    "gemini":     query_gemini,
    "mistral":    query_mistral,
    "groq":       query_groq,
    "perplexity": query_perplexity,
    "cohere":     query_cohere,
    "together":   query_together,
    "ollama":     query_ollama,
    "xai":        query_xai,
    "deepseek":   query_deepseek,
    "qwen":       query_qwen,
    "glm":        query_glm,
    "minimax":    query_minimax,
    "kimi":       query_kimi,
}

PROVIDER_MODELS: dict[str, list[str]] = {
    "openai":     ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
    "anthropic":  ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001",
                   "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
    "gemini":     ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash",
                   "gemini-2.0-flash-thinking-exp"],
    "mistral":    ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
                   "open-mixtral-8x22b"],
    "groq":       ["llama-3.3-70b-versatile", "llama-3.1-8b-instant",
                   "mixtral-8x7b-32768", "gemma2-9b-it"],
    "perplexity": ["llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online",
                   "llama-3.1-sonar-huge-128k-online"],
    "cohere":     ["command-r-plus", "command-r", "command-light"],
    "together":   ["meta-llama/Llama-3-70b-chat-hf", "meta-llama/Llama-3-8b-chat-hf",
                   "mistralai/Mixtral-8x7B-Instruct-v0.1"],
    "ollama":     ["llama3", "mistral", "phi3", "gemma2", "qwen2"],
    "xai":        ["grok-3", "grok-3-mini", "grok-2"],
    "deepseek":   ["deepseek-chat", "deepseek-reasoner"],
    "qwen":       ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long"],
    "glm":        ["glm-4", "glm-4-flash", "glm-3-turbo"],
    "minimax":    ["abab6.5s-chat", "abab6.5-chat", "abab5.5-chat"],
    "kimi":       ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
}


async def query_llm(provider: str, api_key: str, model: str, prompt: str) -> str:
    if provider not in PROVIDERS:
        raise LLMAPIError(f"Unknown provider: {provider}")
    return await PROVIDERS[provider](api_key, model, prompt)
