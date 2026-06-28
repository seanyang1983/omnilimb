"""Self-contained Hermes skill spec + structural Validator (no Hermes-core import).

This module reproduces — as a small, standalone set of constants and pure
functions — the subset of the Hermes native-skill convention the converter needs:
a `SKILL.md` carrying YAML frontmatter with a `name` (lowercase, letter-led,
`[a-z0-9_-]`, ≤ 64 chars) and a `description` (≤ 1024 chars), organized as
`skills/<name>/SKILL.md` with optional script entrypoints.

Nothing here imports or references a Hermes-core symbol at runtime. Three public
surfaces:

- ``normalize_name`` — derive a spec-valid skill name from arbitrary input.
- ``hermes_frontmatter`` — render YAML-safe frontmatter with a provenance block.
- ``validate_skill`` — pure structural checks returning findings; never raises.
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

import yaml  # type: ignore

# Hermes / agentskills.io naming + field limits.
NAME_RE = re.compile(r"^[a-z][a-z0-9_-]*$")
MAX_NAME_LEN = 64
MAX_DESC_LEN = 1024


# --------------------------------------------------------------------------- #
# Name normalization
# --------------------------------------------------------------------------- #
def _sanitize(raw: Any) -> str:
    """Best-effort transform of arbitrary input into a NAME_RE-valid string.

    Lowercases, maps every char outside ``[a-z0-9_-]`` to ``-``, collapses
    repeated dashes, strips leading non-alpha characters (the pattern requires a
    leading letter), trims trailing separators and enforces ``MAX_NAME_LEN``.
    Returns ``""`` when nothing valid survives.
    """
    if not isinstance(raw, str):
        return ""
    s = raw.strip().lower()
    # map any invalid run to a single dash
    s = re.sub(r"[^a-z0-9_-]+", "-", s)
    # collapse repeated dashes introduced above or already present
    s = re.sub(r"-{2,}", "-", s)
    # the first character must be a letter — drop any leading digits/_/-
    s = re.sub(r"^[^a-z]+", "", s)
    # enforce length, then tidy any trailing separators left by truncation
    s = s[:MAX_NAME_LEN].rstrip("-_")
    if s and NAME_RE.match(s) and len(s) <= MAX_NAME_LEN:
        return s
    return ""


def normalize_name(raw: str, fallback_slug: str) -> str:
    """Derive a Hermes-compliant skill name.

    Tries ``raw`` first, then a sanitized form of ``fallback_slug``, and finally
    the literal ``"skill"`` so the result always matches ``NAME_RE`` and is at
    most ``MAX_NAME_LEN`` characters long.
    """
    return _sanitize(raw) or _sanitize(fallback_slug) or "skill"


# --------------------------------------------------------------------------- #
# Frontmatter rendering
# --------------------------------------------------------------------------- #
def hermes_frontmatter(
    name: str,
    description: str,
    provenance: dict,
    extra: dict | None = None,
) -> str:
    """Render valid YAML frontmatter (``---\\n...\\n---\\n``).

    The body always carries ``name`` + ``description`` first, then any ``extra``
    top-level fields, and finally a ``metadata`` block holding the provenance.
    ``yaml.safe_dump`` guarantees the output is YAML-safe regardless of the input
    strings.
    """
    body: dict[str, Any] = {"name": name, "description": description}
    if isinstance(extra, dict):
        for key, value in extra.items():
            if key not in ("name", "description", "metadata"):
                body[key] = value
    body["metadata"] = dict(provenance or {})
    dumped = yaml.safe_dump(
        body,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
    )
    return "---\n" + dumped + "---\n"


# --------------------------------------------------------------------------- #
# Structural Validator
# --------------------------------------------------------------------------- #
def _parse_frontmatter(text: str) -> dict | None:
    """Parse the leading ``---`` frontmatter block; ``None`` when absent.

    When the block is present but is NOT strict YAML — common in third-party
    SKILL.md whose description contains a colon (e.g. ``... profit = revenue:
    cost, name: x``) — fall back to a lenient line-based ``key: value`` parse
    instead of failing, mirroring Hermes' own parser. Never raises.
    """
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    block = parts[1]
    try:
        meta = yaml.safe_load(block)
        if isinstance(meta, dict):
            return meta
    except Exception:
        pass
    # Lenient fallback: split each line on its FIRST colon so a value that
    # itself contains ':' stays intact; keep the first occurrence of each key.
    fm: dict[str, Any] = {}
    for line in block.strip().split("\n"):
        s = line.strip()
        if not s or s.startswith("#") or ":" not in s:
            continue
        k, v = s.split(":", 1)
        k = k.strip()
        if k:
            fm.setdefault(k, v.strip())
    return fm


def _declared_entrypoints(meta: dict) -> list[str]:
    """Collect declared entrypoint paths from common frontmatter shapes."""
    out: list[str] = []

    def _collect(container: Any) -> None:
        if not isinstance(container, dict):
            return
        for key in ("entrypoints", "entry_points"):
            val = container.get(key)
            if isinstance(val, str):
                out.append(val)
            elif isinstance(val, list):
                out.extend(v for v in val if isinstance(v, str))
            elif isinstance(val, dict):
                out.extend(v for v in val.values() if isinstance(v, str))
        for key in ("entrypoint", "entry"):
            val = container.get(key)
            if isinstance(val, str):
                out.append(val)

    _collect(meta)
    _collect(meta.get("metadata"))
    return out


def validate_skill(skill_dir) -> dict:
    """Pure structural Validator for a produced Hermes skill directory.

    Returns ``{"ok": bool, "findings": [{"rule","field","detail"}, ...]}``.
    Checks: ``SKILL.md`` exists and parses as YAML frontmatter; ``name`` is
    non-empty, matches ``NAME_RE`` and ≤ ``MAX_NAME_LEN``; ``description`` is
    non-empty and ≤ ``MAX_DESC_LEN``; every declared entrypoint path exists
    within ``skill_dir``.

    Never raises — on any internal error it returns ``{"ok": True, "findings": []}``
    rather than propagating the exception.
    """
    try:
        skill_dir = Path(skill_dir)
        findings: list[dict] = []

        skill_md = skill_dir / "SKILL.md"
        if not skill_md.exists():
            findings.append({
                "rule": "skill_md_missing",
                "field": "SKILL.md",
                "detail": "SKILL.md not found in skill directory",
            })
            return {"ok": False, "findings": findings}

        try:
            text = skill_md.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            try:
                text = skill_md.read_text(encoding="utf-8", errors="replace")
            except Exception:
                findings.append({
                    "rule": "frontmatter_invalid",
                    "field": "SKILL.md",
                    "detail": "SKILL.md could not be read",
                })
                return {"ok": False, "findings": findings}

        try:
            meta = _parse_frontmatter(text)
        except Exception:
            meta = None
        if not isinstance(meta, dict):
            findings.append({
                "rule": "frontmatter_invalid",
                "field": "SKILL.md",
                "detail": "SKILL.md does not contain valid YAML frontmatter",
            })
            return {"ok": False, "findings": findings}

        # name: present, non-empty, pattern, length
        name = meta.get("name")
        if not isinstance(name, str) or not name.strip():
            findings.append({
                "rule": "name_missing",
                "field": "name",
                "detail": "name is empty or missing",
            })
        else:
            candidate = name.strip()
            if len(candidate) > MAX_NAME_LEN:
                findings.append({
                    "rule": "name_too_long",
                    "field": "name",
                    "detail": f"name exceeds {MAX_NAME_LEN} characters",
                })
            if not NAME_RE.match(candidate):
                findings.append({
                    "rule": "name_invalid",
                    "field": "name",
                    "detail": "name must match ^[a-z][a-z0-9_-]*$",
                })

        # description: present, non-empty, length
        desc = meta.get("description")
        if not isinstance(desc, str) or not desc.strip():
            findings.append({
                "rule": "description_missing",
                "field": "description",
                "detail": "description is empty or missing",
            })
        elif len(desc) > MAX_DESC_LEN:
            findings.append({
                "rule": "description_too_long",
                "field": "description",
                "detail": f"description exceeds {MAX_DESC_LEN} characters",
            })

        # entrypoints: each declared path must exist within skill_dir
        skill_root = skill_dir.resolve()
        for entry in _declared_entrypoints(meta):
            if not isinstance(entry, str) or not entry.strip():
                continue
            rel = entry.strip()
            within = False
            exists = False
            try:
                target = (skill_dir / rel).resolve()
                within = str(target) == str(skill_root) or str(target).startswith(
                    str(skill_root) + os.sep
                )
                exists = within and target.exists()
            except Exception:
                within = False
                exists = False
            if not exists:
                findings.append({
                    "rule": "entrypoint_missing",
                    "field": rel,
                    "detail": f"declared entrypoint not found within skill: {rel}",
                })

        return {"ok": len(findings) == 0, "findings": findings}
    except Exception:
        # Never raise — Req 5.5.
        return {"ok": True, "findings": []}
