"""AI_Curation helper for the skill-to-Hermes converter.

Self-contained on purpose:

* **No Hermes-core import.** The Language_Model source is resolved by reading the
  user's ``~/.hermes/config.yaml`` and ``~/.hermes/.env`` as *plain* files. We do
  not import any Hermes runtime module — the converter must stay entirely inside
  the Omnilimb plugin and keep working in standalone tests.
* **No module-level network call.** Importing this module performs zero I/O beyond
  what Python needs to define the symbols below. The single OpenAI-compatible
  request lives in ``curate(...)`` (implemented separately) and is injected for
  tests so nothing here ever touches the network on import.
* **Secrets stay secret.** The resolved API key is returned only so the caller can
  build a request header. It is never logged, echoed into the Conversion_Report,
  the audit log, or any UI payload.

Every failure path returns ``None`` (or an empty result) so the caller can fall
back to the deterministic mapping. Nothing in this module raises.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Bounds (Req 13 — sensible caps for a single documentation rewrite).
# ---------------------------------------------------------------------------
AI_TIMEOUT_S = 60               # per-request wall clock (connect + read)
AI_MAX_INPUT_CHARS = 24000      # source SKILL.md + script excerpts truncated to this
AI_MAX_OUTPUT_TOKENS = 1500     # cap on the model's generated documentation
AI_SCRIPT_EXCERPT_CHARS = 4000  # per-script content summary cap


# ---------------------------------------------------------------------------
# Known OpenAI-compatible provider endpoints. Used only as a last-resort default
# when the Hermes config names a provider but does not spell out its base_url.
# ---------------------------------------------------------------------------
_PROVIDER_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "deepseek": "https://api.deepseek.com",
    "moonshot": "https://api.moonshot.ai/v1",
    "kimi": "https://api.moonshot.ai/v1",
    "groq": "https://api.groq.com/openai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "together": "https://api.together.xyz/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}


def _hermes_home() -> Path:
    """Resolve the active Hermes home directory.

    Delegates to the plugin's single canonical resolver (``config.get_hermes_home``
    → ``hermes_constants.get_hermes_home`` inside Hermes, ``~/.hermes`` standalone)
    so model-config lookup reads the SAME home the converter writes skills into.
    Falls back to the env/``~/.hermes`` only if that import is unavailable.
    """
    try:
        from .config import get_hermes_home

        return get_hermes_home()
    except Exception:
        override = os.environ.get("HERMES_HOME")
        if override and override.strip():
            return Path(override.strip())
        return Path.home() / ".hermes"


def _clean(value: Any) -> str | None:
    """Coerce ``value`` to a trimmed non-empty string, else ``None``."""
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _first_nonempty(*values: Any) -> str | None:
    """Return the first argument that cleans to a non-empty string."""
    for value in values:
        cleaned = _clean(value)
        if cleaned is not None:
            return cleaned
    return None


def _read_yaml(path: Path) -> dict[str, Any]:
    """Best-effort plain read of a YAML mapping. Never raises."""
    try:
        if not path.exists():
            return {}
        import yaml  # type: ignore

        with open(path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _parse_env_file(path: Path) -> dict[str, str]:
    """Parse a ``.env`` file into a ``KEY -> value`` mapping. Never raises.

    Handles ``export KEY=value`` lines, ``#`` comments, blank lines, and values
    wrapped in single or double quotes. This is a deliberately tiny parser so we
    never have to import a Hermes (or third-party dotenv) module.
    """
    out: dict[str, str] = {}
    try:
        if not path.exists():
            return out
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.lower().startswith("export "):
                line = line[len("export "):].strip()
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            if not key:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            out[key] = value
    except Exception:
        return out
    return out


def _resolve_api_key(env: dict[str, str], provider: str | None) -> str | None:
    """Find the API key for ``provider`` from the parsed ``.env`` (or os.environ).

    Tries the provider-specific name first (``DEEPSEEK_API_KEY``,
    ``OPENAI_API_KEY``, ...), then common fallbacks, then any ``*_API_KEY`` entry.
    The value is treated as a secret and is never logged.
    """
    candidates: list[str] = []
    if provider:
        pu = provider.upper()
        candidates.append(f"{pu}_API_KEY")
        pn = pu.replace("-", "_")          # Hermes providers are often hyphenated
        if pn != pu:                        # (opencode-zen) but env keys use '_'
            candidates.append(f"{pn}_API_KEY")
    candidates += ["OPENAI_API_KEY", "HERMES_API_KEY", "API_KEY"]
    for key in candidates:
        found = _first_nonempty(env.get(key), os.environ.get(key))
        if found is not None:
            return found
    # Last resort: the first explicit *_API_KEY declared in the .env file.
    for key, value in env.items():
        if key.upper().endswith("_API_KEY"):
            found = _clean(value)
            if found is not None:
                return found
    return None


def _hermes_model_config() -> dict[str, str] | None:
    """Hermes_Model_Config (preferred): read ``config.yaml`` + ``.env`` directly."""
    try:
        home = _hermes_home()
        cfg = _read_yaml(home / "config.yaml")
        model_cfg = cfg.get("model")
        if not isinstance(model_cfg, dict):
            model_cfg = {}

        provider = _clean(model_cfg.get("provider"))
        provider_lc = provider.lower() if provider else None
        model = _first_nonempty(model_cfg.get("default"), model_cfg.get("model"))

        env = _parse_env_file(home / ".env")
        api_key = _resolve_api_key(env, provider_lc)

        # Hermes provider ids are often hyphenated (opencode-zen, opencode-go),
        # but their .env vars use underscores (OPENCODE_ZEN_BASE_URL). Normalize.
        pkey = provider_lc.upper().replace("-", "_") if provider_lc else None
        base_url = _first_nonempty(
            model_cfg.get("base_url"),
            env.get(f"{pkey}_BASE_URL") if pkey else None,
            os.environ.get(f"{pkey}_BASE_URL") if pkey else None,
            env.get("OPENAI_BASE_URL"),
            os.environ.get("OPENAI_BASE_URL"),
            _PROVIDER_BASE_URLS.get(provider_lc) if provider_lc else None,
        )

        if base_url and api_key:
            return {
                "base_url": base_url.rstrip("/"),
                "api_key": api_key,
                "model": model or "",
            }
    except Exception:
        return None
    return None


def _omnilimb_model_config() -> dict[str, str] | None:
    """Omnilimb_Model_Config (fallback): OpenAI-compatible endpoint from settings.

    Reads the merged ``config.yaml`` ``omnilimb:`` section + ``omnilimb.overrides.json``
    via the plugin's own ``config.get_settings()`` (a relative import inside the
    plugin — not a Hermes-core module), plus ``OMNILIMB_AI_*`` / ``OPENAI_*`` env
    overrides.
    """
    try:
        raw: dict[str, Any] = {}
        try:
            from .config import get_settings

            raw = dict(getattr(get_settings(), "_raw_yaml", {}) or {})
        except Exception:
            raw = {}

        ai = raw.get("ai") if isinstance(raw.get("ai"), dict) else {}

        base_url = _first_nonempty(
            os.environ.get("OMNILIMB_AI_BASE_URL"),
            ai.get("base_url"),
            raw.get("ai_base_url"),
            os.environ.get("OPENAI_BASE_URL"),
        )
        api_key = _first_nonempty(
            os.environ.get("OMNILIMB_AI_API_KEY"),
            ai.get("api_key"),
            raw.get("ai_api_key"),
            os.environ.get("OPENAI_API_KEY"),
        )
        model = _first_nonempty(
            os.environ.get("OMNILIMB_AI_MODEL"),
            ai.get("model"),
            raw.get("ai_model"),
            os.environ.get("OPENAI_MODEL"),
        )

        if base_url and api_key:
            return {
                "base_url": base_url.rstrip("/"),
                "api_key": api_key,
                "model": model or "",
            }
    except Exception:
        return None
    return None


def resolve_model_config() -> dict | None:
    """Resolve the Language_Model source for AI_Curation.

    Resolution order:

    1. **Hermes_Model_Config (preferred):** the active model/provider from
       ``~/.hermes/config.yaml`` and the API key + base_url from ``~/.hermes/.env``,
       read as plain files (no Hermes-core import). Honors ``HERMES_HOME``.
    2. **Omnilimb_Model_Config (fallback):** the OpenAI-compatible endpoint + key
       configured in the omnilimb settings / ``omnilimb.overrides.json``.

    Returns ``{"base_url", "api_key", "model"}`` or ``None`` when neither source
    yields a usable endpoint + key. The API key is a secret and is never logged.
    Never raises.
    """
    try:
        return _hermes_model_config() or _omnilimb_model_config()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Prompt construction + response parsing for the single documentation rewrite.
# ---------------------------------------------------------------------------
_SYSTEM_PROMPT = (
    "You are a senior technical writer producing documentation for a Hermes "
    "skill. A Hermes skill is described by a single SKILL.md file. You are given "
    "the original source skill's SKILL.md and excerpts of its scripts. Rewrite "
    "ONLY the documentation (never the scripts, never the skill name). Produce "
    "clear, accurate, well-structured Markdown that a Hermes agent can use to "
    "decide when and how to invoke the skill.\n\n"
    "Your output MUST include, in this order:\n"
    "1. A clear one-paragraph description of what the skill does.\n"
    "2. A usage guide explaining how to use the skill.\n"
    "3. Parameter and input/output descriptions.\n"
    "4. Concrete examples.\n"
    "5. Triggering guidance: when an agent should reach for this skill.\n\n"
    "Respond with STRICT JSON only (no markdown fences, no prose around it) of "
    'the exact shape: {"description": "<one-line skill description, plain text>", '
    '"body": "<the full SKILL.md body in Markdown, excluding YAML frontmatter>"}. '
    "The description must be a concise single line suitable for YAML frontmatter. "
    "Do not invent functionality that is not evidenced by the source."
)


def _truncate(text: str, limit: int) -> str:
    """Trim ``text`` to at most ``limit`` characters with a marker. Never raises."""
    try:
        s = str(text)
    except Exception:
        return ""
    if limit <= 0:
        return ""
    if len(s) <= limit:
        return s
    marker = "\n...[truncated]..."
    if limit <= len(marker):
        return s[:limit]
    return s[: limit - len(marker)] + marker


def _build_user_prompt(source_skill_md: str, scripts: list[dict], slug: str) -> str:
    """Assemble the user message, enforcing per-script and overall input caps.

    The source ``SKILL.md`` is always included (itself capped). Each script
    excerpt is capped to ``AI_SCRIPT_EXCERPT_CHARS``; scripts are appended until
    the running total would exceed ``AI_MAX_INPUT_CHARS``, after which remaining
    scripts are listed by path only. Never raises; never mutates ``scripts``.
    """
    slug_text = _clean(slug) or "skill"
    header = f"Source skill slug: {slug_text}\n\n=== SOURCE SKILL.md ===\n"

    # Reserve room for the source SKILL.md (cap it to a generous slice of budget).
    source_cap = min(AI_MAX_INPUT_CHARS, max(0, AI_MAX_INPUT_CHARS - 1000))
    source_text = _truncate(source_skill_md or "", source_cap)

    parts: list[str] = [header, source_text, "\n"]
    used = len(header) + len(source_text) + 1

    listed_only: list[str] = []
    for entry in scripts or []:
        if not isinstance(entry, dict):
            continue
        path = _clean(entry.get("path")) or "(unnamed)"
        excerpt = _truncate(entry.get("excerpt") or "", AI_SCRIPT_EXCERPT_CHARS)
        block = f"\n=== SCRIPT: {path} ===\n{excerpt}\n"
        if used + len(block) > AI_MAX_INPUT_CHARS:
            listed_only.append(path)
            continue
        parts.append(block)
        used += len(block)

    if listed_only:
        tail = "\n=== ADDITIONAL SCRIPTS (not shown, input cap reached) ===\n" + "\n".join(
            listed_only
        )
        # Only append the tail if it still fits; otherwise drop silently.
        if used + len(tail) <= AI_MAX_INPUT_CHARS:
            parts.append(tail)

    prompt = "".join(parts)
    # Final hard guarantee on the overall input cap.
    return _truncate(prompt, AI_MAX_INPUT_CHARS)


def _default_http_post(url: str, *, headers: dict, json: dict, timeout: float):
    """Thin ``httpx.post`` wrapper. ``httpx`` is imported lazily so importing this
    module stays network/dependency-light. Raises on transport error so the
    caller's ``except`` turns it into a ``None`` fallback."""
    import httpx  # local import: keep module import dependency-light

    return httpx.post(url, headers=headers, json=json, timeout=timeout)


def _extract_content(payload: Any) -> str | None:
    """Pull the assistant message text out of an OpenAI-compatible response."""
    try:
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            return None
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        if not isinstance(message, dict):
            return None
        content = message.get("content")
        if isinstance(content, list):  # some providers return content parts
            text = "".join(
                str(part.get("text", "")) if isinstance(part, dict) else str(part)
                for part in content
            )
        else:
            text = content
        return _clean(text)
    except Exception:
        return None


def _parse_doc(content: str) -> dict | None:
    """Parse the model's JSON ``{"description","body"}`` reply leniently.

    Strips optional ```` ```json ```` fences and extracts the first balanced JSON
    object if the model wrapped it in prose. Returns ``{"description","body"}``
    with both as non-empty strings, else ``None``. Never raises.
    """
    import json as _jsonlib

    text = _clean(content)
    if text is None:
        return None

    # Strip code fences if present.
    if text.startswith("```"):
        lines = text.splitlines()
        if lines:
            lines = lines[1:]  # drop opening fence (``` or ```json)
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    candidates: list[str] = [text]
    # Fallback: the first balanced {...} block anywhere in the text.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidates.append(text[start : end + 1])

    for candidate in candidates:
        try:
            data = _jsonlib.loads(candidate)
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        description = _clean(data.get("description"))
        body = _clean(data.get("body"))
        if description and body:
            return {"description": description, "body": body}
    return None


def curate(
    *,
    source_skill_md: str,
    scripts: list[dict],
    slug: str,
    model_config: dict | None = None,
    http_post=None,
    timeout_s: float = AI_TIMEOUT_S,
    system_prompt: str | None = None,
) -> dict | None:
    """Request a rewritten Hermes ``SKILL.md`` document from the Language_Model.

    Builds an OpenAI-compatible ``chat/completions`` request to
    ``<base_url>/chat/completions`` (``base_url`` / ``api_key`` / ``model`` taken
    from ``model_config``, defaulting to :func:`resolve_model_config`) and sends
    the source ``SKILL.md`` plus per-script excerpts. Input is capped overall by
    ``AI_MAX_INPUT_CHARS`` and per script by ``AI_SCRIPT_EXCERPT_CHARS``;
    ``max_tokens`` is set to ``AI_MAX_OUTPUT_TOKENS``.

    ``http_post`` is injectable for tests (default a thin ``httpx.post`` wrapper).
    The request is bounded by ``timeout_s``.

    Returns ``{"description": str, "body": str}`` on success. Returns ``None`` on
    ANY unavailable / connection / HTTP-error / timeout / malformed-response path.

    Never raises. Never modifies script bytes. Never logs or echoes the API key.
    """
    try:
        config = model_config if isinstance(model_config, dict) else None
        if config is None:
            config = resolve_model_config()
        if not isinstance(config, dict):
            return None

        base_url = _clean(config.get("base_url"))
        api_key = _clean(config.get("api_key"))
        model = _clean(config.get("model")) or "gpt-4o-mini"
        if not base_url or not api_key:
            return None

        url = base_url.rstrip("/") + "/chat/completions"
        user_prompt = _build_user_prompt(source_skill_md or "", scripts or [], slug)

        request_body: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt or _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": AI_MAX_OUTPUT_TOKENS,
            "temperature": 0.2,
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            timeout = float(timeout_s)
        except Exception:
            timeout = AI_TIMEOUT_S
        if timeout <= 0:
            timeout = AI_TIMEOUT_S

        poster = http_post if callable(http_post) else _default_http_post

        response = poster(url, headers=headers, json=request_body, timeout=timeout)
        if response is None:
            return None

        # Reject non-2xx responses (support both httpx.Response and fakes).
        status = getattr(response, "status_code", None)
        if status is not None:
            try:
                if int(status) < 200 or int(status) >= 300:
                    return None
            except Exception:
                return None

        try:
            payload = response.json()
        except Exception:
            return None

        content = _extract_content(payload)
        if content is None:
            return None

        return _parse_doc(content)
    except Exception:
        # Any unavailable / connection / HTTP-error / timeout / malformed path.
        return None
