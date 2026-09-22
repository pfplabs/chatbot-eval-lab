"""Real Responses API backend, plus an explicit offline mode. Standard library only."""
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request

from model import generate

ROOT = Path(__file__).parent
# Simple KEY=value / quoted-value .env syntax; existing environment takes precedence.
if (ROOT / ".env").exists():
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        os.environ.setdefault(name.strip(), value.strip().strip("\"'"))

BACKEND = "offline" if "--offline" in sys.argv else "openai"
MODEL = os.environ.get("OPENAI_MODEL") or "gpt-4.1-mini"
SCHEMA = json.loads((ROOT / "answer.schema.json").read_text())


def generate_answer(messages):
    started = time.perf_counter()
    if BACKEND == "offline":
        return {**generate(messages), "metadata": {
            "backend": BACKEND, "model": "simulator",
            "latency_ms": round((time.perf_counter() - started) * 1000),
        }}
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("Missing OPENAI_API_KEY. Set it in .env or use --offline.")
    body = {
        "model": MODEL, "input": messages, "store": False, "max_output_tokens": 512,
        "text": {"format": {"type": "json_schema", "name": "support_answer", "strict": True, "schema": SCHEMA}},
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses", data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"OpenAI HTTP {error.code}. Check API key, billing, rate limits, and model access.") from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError("OpenAI network request failed or timed out. Check connectivity.") from None
    if payload.get("status") != "completed":
        raise RuntimeError(f"OpenAI response did not complete ({payload.get('status')}).")
    content = [part for item in payload["output"] for part in item.get("content", [])]
    if any(part["type"] == "refusal" for part in content):
        raise RuntimeError("Model refused the request.")
    text = "".join(part["text"] for part in content if part["type"] == "output_text")
    try:
        answer = json.loads(text)
        if not isinstance(answer, dict) or answer.get("decision") not in SCHEMA["properties"]["decision"]["enum"] or not isinstance(answer.get("text"), str):
            raise ValueError()
    except (ValueError, TypeError):
        raise RuntimeError("Model returned an invalid answer object.") from None
    return {**answer, "metadata": {
        "backend": BACKEND, "model": payload["model"],
        "latency_ms": round((time.perf_counter() - started) * 1000),
        "usage": payload.get("usage"), "response_id": payload["id"],
    }}
