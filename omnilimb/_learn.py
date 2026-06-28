"""Open-ended skill distillation — the `/learn`-equivalent for Omnilimb.

Where the Converter (`_converter.py`) turns an ALREADY-INSTALLED ClawHub/SkillHub
skill into a native Hermes skill, `_learn` widens the intake to anything the user
can point at — a local directory or file, a URL, or pasted text — and authors a
native Hermes `SKILL.md` from it. It reuses the same robust substrate the
converter relies on: the standalone Hermes skill spec + structural Validator
(`_hermes_skill_spec`), the optional OpenAI-compatible AI curation with
deterministic fallback (`_ai_curate`), and the converter's transactional write.

Unlike the converter (which carries a source skill's own docs over largely
verbatim), `_learn` authors to the **Hermes HARDLINE skill-authoring standards**:
a one-sentence `description` of at most 60 characters, the modern section order,
`author: Hermes`, and Hermes-tool framing. This mirrors the official
`/learn` command (`agent/learn_prompt.py`) so Omnilimb 1.0 is a superset of it:
open-ended sourcing + a validation gate + dashboard management.

Public surface: :func:`run_learn`. Returns a report dict; never raises.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Any

from . import _ai_curate, _converter, _hermes_skill_spec as _spec

# Hermes HARDLINE: the system-prompt skill index truncates descriptions to 60.
LEARN_MAX_DESC = 60
# Caps for open-ended intake (mirrors _ai_curate's input budget).
_MAX_SOURCE_CHARS = 24000
_READABLE_EXTS = (
    ".md", ".txt", ".rst", ".py", ".js", ".mjs", ".ts", ".sh", ".rb", ".go",
    ".json", ".yaml", ".yml", ".toml", ".cfg", ".ini", ".html",
)

# The HARDLINE authoring standards, distilled from Hermes AGENTS.md and the
# official /learn prompt. Drives AI curation in learn-mode; the model returns
# STRICT JSON {"description","body"} where body is the SKILL.md minus frontmatter.
_HARDLINE_SYSTEM_PROMPT = (
    "You are a Hermes skill author. From the source material you are given "
    "(documentation, code, a web page, or notes), author ONE reusable Hermes "
    "skill as a single SKILL.md body. Follow these HARDLINE standards exactly:\n\n"
    "- description: ONE sentence, AT MOST 60 characters, ends with a period. "
    "State the capability, not the implementation. No marketing words "
    "(powerful, comprehensive, seamless, advanced, robust). Do NOT repeat the "
    "skill name. Count the characters; if over 60, cut it down.\n"
    "- Body section order (omit a section only if it genuinely has no content): "
    "a '# <Human Title>' then a 2-3 sentence intro (what it does, what it does "
    "NOT do); '## When to Use'; '## Prerequisites'; '## How to Run'; "
    "'## Quick Reference'; '## Procedure'; '## Pitfalls'; '## Verification'.\n"
    "- Frame running scripts as 'invoke through the `terminal` tool'. Reference "
    "Hermes tools by name in backticks (`terminal`, `read_file`, `write_file`, "
    "`search_files`, `patch`, `web_extract`, `web_search`, `browser_navigate`, "
    "`delegate_task`). Do NOT name shell utilities the agent already wraps "
    "(use `read_file` not cat, `search_files` not grep/find, `patch` not sed).\n"
    "- Prefer exact commands, endpoints, and config keys that appear VERBATIM in "
    "the source. NEVER invent flags, paths, or APIs. Keep it tight: ~100 lines "
    "for a simple skill, ~200 for a complex one.\n\n"
    "Respond with STRICT JSON only (no markdown fences, no prose around it) of "
    'the exact shape: {"description": "<<=60 char one-line description, plain '
    'text, ends with a period>", "body": "<the full SKILL.md body in Markdown, '
    'excluding YAML frontmatter>"}.'
)


def detect_source_type(source: str) -> str:
    """Classify *source* as ``url`` / ``path`` / ``text`` (best-effort)."""
    s = (source or "").strip()
    if not s:
        return "text"
    low = s.lower()
    if low.startswith(("http://", "https://")):
        return "url"
    try:
        if Path(s).expanduser().exists():
            return "path"
    except Exception:
        pass
    return "text"


def _truncate(text: str, limit: int = _MAX_SOURCE_CHARS) -> str:
    s = str(text or "")
    return s if len(s) <= limit else s[: limit - 16] + "\n...[truncated]..."


def _fetch_url(url: str) -> str:
    """Fetch a URL's text body. Never raises — returns '' on any failure."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "omnilimb-learn/1.0"})
        with urllib.request.urlopen(req, timeout=20) as r:  # noqa: S310
            raw = r.read(2_000_000)
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return ""


def _gather_path(p: Path) -> tuple[str, list[dict]]:
    """Read a local file or directory into (source_md_text, script_excerpts)."""
    scripts: list[dict] = []
    if p.is_file():
        try:
            text = p.read_text(encoding="utf-8", errors="replace")
        except Exception:
            text = ""
        return f"=== FILE: {p.name} ===\n{_truncate(text)}", scripts
    # directory: prefer its own SKILL.md, else concatenate readable files
    parts: list[str] = []
    skill_md = p / "SKILL.md"
    if skill_md.exists():
        try:
            parts.append("=== SKILL.md ===\n" + skill_md.read_text(encoding="utf-8", errors="replace"))
        except Exception:
            pass
    used = sum(len(x) for x in parts)
    try:
        for child in sorted(p.rglob("*")):
            if used >= _MAX_SOURCE_CHARS:
                break
            if not child.is_file() or child.name == "SKILL.md":
                continue
            if any(part.startswith(".") for part in child.relative_to(p).parts):
                continue
            if child.suffix.lower() not in _READABLE_EXTS:
                continue
            try:
                content = child.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            rel = child.relative_to(p).as_posix()
            block = f"\n=== {rel} ===\n{_truncate(content, 4000)}"
            parts.append(block)
            used += len(block)
    except Exception:
        pass
    return _truncate("\n".join(parts)), scripts


def _gather(source: str, source_type: str) -> tuple[str, str]:
    """Resolve *source* into (title_hint, source_md_text). Never raises."""
    if source_type == "url":
        return source.rsplit("/", 1)[-1] or "web-skill", _truncate(_fetch_url(source))
    if source_type == "path":
        p = Path(source).expanduser()
        text, _ = _gather_path(p)
        return p.stem or p.name or "skill", text
    # text
    first = ""
    for line in (source or "").splitlines():
        if line.strip():
            first = line.strip().lstrip("#").strip()
            break
    return (first[:40] or "skill"), _truncate(source)


def _enforce_desc(desc: str, fallback: str) -> str:
    """Coerce *desc* to a non-empty, HARDLINE-length one-liner ending with a period."""
    d = " ".join(str(desc or "").split()).strip()
    if not d:
        d = " ".join(str(fallback or "skill").split()).strip() or "Reusable skill."
    if len(d) > LEARN_MAX_DESC:
        d = d[:LEARN_MAX_DESC].rstrip()
    if not d.endswith("."):
        # keep within the cap even after adding the period
        d = (d[: LEARN_MAX_DESC - 1].rstrip() if len(d) >= LEARN_MAX_DESC else d) + "."
    return d


def _deterministic_doc(title_hint: str, source_md: str) -> dict:
    """Rule-based {description, body} when AI curation is unavailable."""
    desc = _enforce_desc(title_hint, "Reusable skill.")
    body = (
        f"# {title_hint or 'Skill'}\n\n"
        "Distilled by Omnilimb from the provided source.\n\n"
        "## Source\n\n"
        f"{_truncate(source_md, 8000)}\n"
    )
    return {"description": desc, "body": body}


def run_learn(
    *,
    source: str,
    source_type: str = "auto",
    mode: str = "ai_curated",
    name: str | None = None,
    overwrite: bool = True,
    output_dir: str | None = None,
    curate_fn=None,
) -> dict:
    """Distill a native Hermes skill from an open-ended source. Never raises.

    Returns a report dict: ``{ok, name, mode, mode_requested, fell_back,
    output_path, description, source_type, validation, status}``.
    """
    mode_requested = "ai_curated" if mode == "ai_curated" else "deterministic"
    try:
        stype = source_type if source_type in ("url", "path", "text") else detect_source_type(source)
        title_hint, source_md = _gather(source, stype)
        if not (source_md or "").strip():
            return {"ok": False, "error": "empty or unreadable source", "source_type": stype}

        skill_name = _spec.normalize_name(name or "", title_hint)
        src_id = f"{stype}:{source}".encode("utf-8")
        source_hash = "sha256:" + hashlib.sha256(src_id + b"\0" + source_md.encode("utf-8")).hexdigest()

        try:
            from .config import hermes_skills_dir
            root = Path(output_dir).expanduser() if output_dir else hermes_skills_dir()
        except Exception:
            root = Path(output_dir).expanduser() if output_dir else (Path.home() / ".hermes" / "skills")
        root.mkdir(parents=True, exist_ok=True)
        dest = root / skill_name
        existed_before = dest.exists()

        # Idempotence: unchanged source + existing skill = no-op.
        if dest.exists() and _converter._existing_source_hash(dest) == source_hash and not overwrite:
            return {
                "ok": True, "status": "unchanged", "name": skill_name,
                "mode": "deterministic", "mode_requested": mode_requested,
                "fell_back": False, "output_path": str(dest), "source_type": stype,
                "validation": {"ok": True, "findings": []},
            }

        mode_used = "deterministic"
        fell_back = False
        doc: dict | None = None
        if mode_requested == "ai_curated":
            curate = curate_fn or _ai_curate.curate
            # The model call can fail transiently (slow/flaky proxy, rate limit).
            # Retry once before giving up and falling back to the offline draft.
            for _attempt in range(2):
                try:
                    doc = curate(
                        source_skill_md=source_md, scripts=[], slug=skill_name,
                        system_prompt=_HARDLINE_SYSTEM_PROMPT,
                    )
                except Exception:
                    doc = None
                if isinstance(doc, dict) and str(doc.get("description") or "").strip() \
                        and str(doc.get("body") or "").strip():
                    mode_used = "ai_curated"
                    break
                doc = None
            if doc is None:
                fell_back = True
        if doc is None:
            doc = _deterministic_doc(title_hint, source_md)

        description = _enforce_desc(doc.get("description"), title_hint)
        body = str(doc.get("body") or "").strip()

        metadata = {
            "omnilimb_learn_source": source if stype != "text" else "(pasted text)",
            "omnilimb_learn_source_type": stype,
            "omnilimb_source_hash": source_hash,
            "omnilimb_learned_at": time.time(),
        }
        extra = {"author": "Hermes"}
        content = _spec.hermes_frontmatter(skill_name, description, metadata, extra) + "\n" + body + "\n"

        # Transactional write + structural validation (reuses the converter path).
        tmp_src = Path(tempfile.mkdtemp(prefix="omnilimb_learn_"))
        try:
            validation, written = _converter._write_skill(tmp_src, dest, {"content": content, "entrypoints": []})
        finally:
            shutil.rmtree(tmp_src, ignore_errors=True)

        if not written:
            return {
                "ok": False, "status": "failed", "name": skill_name,
                "mode": mode_used, "mode_requested": mode_requested, "fell_back": fell_back,
                "output_path": None, "source_type": stype, "validation": validation,
                "reason": "structural validation failed",
            }

        return {
            "ok": True,
            "status": "relearned" if existed_before else "learned",
            "name": skill_name,
            "mode": mode_used,
            "mode_requested": mode_requested,
            "fell_back": fell_back,
            "output_path": str(dest),
            "description": description,
            "source_type": stype,
            "validation": validation,
        }
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}", "source_type": source_type}
