import os
import time
from typing import List, Dict, Any

try:
    import openai
except Exception:
    openai = None

import requests

MODEL = os.environ.get("OPENAI_MODEL", "gpt-3.5-turbo")


def has_key() -> bool:
    return bool(os.environ.get("OPENAI_API_KEY"))


def chat_completion(messages: List[Dict[str, str]], max_tokens: int = 300, temperature: float = 0.7) -> str:
    """Call OpenAI Chat Completion API (uses openai package if available, else requests).

    messages: list of {"role":"system"|"user"|"assistant", "content": str}
    Returns assistant content string. Raises on persistent failures.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    # If openai package is available, prefer it (handles models and responses)
    if openai is not None:
        openai.api_key = api_key
        attempts = 0
        while attempts < 3:
            try:
                resp = openai.ChatCompletion.create(
                    model=MODEL,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
                return resp.choices[0].message.content.strip()
            except Exception:
                attempts += 1
                if attempts >= 3:
                    raise
                time.sleep(1 + attempts)

    # Fallback to direct HTTP call if openai package missing
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}

    attempts = 0
    while attempts < 3:
        try:
            r = requests.post(url, json=payload, headers=headers, timeout=15)
            r.raise_for_status()
            data = r.json()
            return data["choices"][0]["message"]["content"].strip()
        except Exception:
            attempts += 1
            if attempts >= 3:
                raise
            time.sleep(1 + attempts)


def chat_completion_with_tools(messages: List[Dict[str, str]], tools: List[Dict], tool_choice: str = "auto") -> Any:
    """Optional helper for function-calling/tool flow. Returns either assistant text or tool arguments dict.
    This uses a requests-based payload including `tools` field (experimental and depends on model support).
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    payload = {
        "model": "gpt-3.5-turbo-0613",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 300,
    }

    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    r = requests.post(url, json=payload, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    message_data = data["choices"][0].get("message", {})

    # Attempt to parse function/tool call if present
    if message_data.get("function_call"):
        fc = message_data["function_call"]
        # return name and arguments if available
        return {"name": fc.get("name"), "arguments": fc.get("arguments")}
    return message_data.get("content", "").strip()