"""Pure Converter engine for skill-to-Hermes conversion (no Hermes-core import).

This module implements the deterministic Converter described in the
``skill-to-hermes-conversion`` design: it discovers installed Source_Skills,
maps each onto the Hermes skill spec, writes the produced Hermes_Skill
transactionally, drives a bounded run -> test -> fix -> retest Validation_Loop,
enforces idempotence via a stable source content hash, isolates per-skill
failures, and assembles a structured Conversion_Report.

Nothing here imports or references a Hermes-core symbol. ``HERMES_HOME`` is read
directly from the environment. The single public surface is
:func:`run_conversion`, which returns the Conversion_Report **dict** (not a JSON
string) and never raises to its caller.
"""

from __future__ import annotations

import hashlib
import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Any, Callable

from . import _ai_curate, _hermes_skill_spec as _spec, _licensing
from .config import get_settings

# The two Conversion_Mode values the Converter recognises. Any other value
# (missing, empty, non-string, or an unknown string) normalises to
# ``deterministic`` (Req 12.1, 12.2).
_VALID_MODES = ("deterministic", "ai_curated")


def _normalize_mode(mode: Any) -> str:
    """Normalise an arbitrary ``mode`` input to a recognised Conversion_Mode.

    Returns ``"ai_curated"`` only when ``mode`` is exactly that string; every
    other value — including ``None``, empty, non-string, or any unrecognised
    string — resolves to ``"deterministic"`` (Req 12.1, 12.2).
    """
    if isinstance(mode, str) and mode in _VALID_MODES:
        return mode
    return "deterministic"

# Script extensions we recognise as candidate entrypoints when none are declared.
_SCRIPT_EXTS = (".py", ".js", ".mjs", ".sh", ".rb", ".ps1")


# --------------------------------------------------------------------------- #
# Internal exceptions (caught per-skill / at the batch boundary)
# --------------------------------------------------------------------------- #
class ParseError(Exception):
    """Raised by :func:`_read_source` when source content cannot be parsed."""


class OutputError(Exception):
    """Raised by :func:`_resolve_output_root` when the output root is unusable."""


# --------------------------------------------------------------------------- #
# 2.1 Discovery, source read, source hashing
# --------------------------------------------------------------------------- #
def _skills_root() -> Path:
    """The omnilimb workspace skills root (``workspace_dir()/skills``)."""
    return get_settings().workspace_dir() / "skills"


def _safe_name(slug: str) -> str:
    """Reduce a slug to its installed-directory name (mirrors NativeBackend)."""
    return str(slug).replace("git:", "").rstrip("/").split("/")[-1].split("@")[0]


def _locate_skill_md(dir_path: Path) -> Path | None:
    """Return the directory holding ``SKILL.md`` (top-level or one level deep)."""
    if (dir_path / "SKILL.md").exists():
        return dir_path
    try:
        for child in sorted(dir_path.iterdir()):
            if child.is_dir() and (child / "SKILL.md").exists():
                return child
    except OSError:
        return None
    return None


def _origin_slug(dir_path: Path) -> str | None:
    """Best-effort read of the installed slug from a ``.clawhub/origin.json``."""
    for op in (dir_path / ".clawhub" / "origin.json", dir_path / "origin.json"):
        if op.exists():
            try:
                import json

                data = json.loads(op.read_text(encoding="utf-8"))
                if isinstance(data, dict) and data.get("slug"):
                    return str(data["slug"])
            except Exception:
                continue
    return None


def _installed_index() -> dict[str, Path]:
    """Map every recognisable identifier (dir name, safe name, origin slug) to dir."""
    index: dict[str, Path] = {}
    root = _skills_root()
    if not root.is_dir():
        return index
    try:
        children = sorted(root.iterdir())
    except OSError:
        return index
    for child in children:
        if not child.is_dir() or child.name.startswith("."):
            continue
        index.setdefault(child.name, child)
        index.setdefault(_safe_name(child.name), child)
        origin = _origin_slug(child)
        if origin:
            index.setdefault(origin, child)
            index.setdefault(_safe_name(origin), child)
    return index


def _discover(slugs: list[str] | None) -> list[dict]:
    """Enumerate the requested installed Source_Skills.

    With no scope (``None``/empty) every installed skill directory is returned;
    with explicit slugs the operation is restricted to the named directories.
    Each returned item is ``{"slug", "dir", "skill_dir", "error"}`` where
    ``dir`` is ``None`` when the slug is not installed and ``skill_dir`` is
    ``None`` when the installed directory lacks a ``SKILL.md``.
    """
    items: list[dict] = []
    root = _skills_root()

    if not slugs:
        # All installed skills (filesystem scan, deterministic order).
        if root.is_dir():
            try:
                children = sorted(root.iterdir())
            except OSError:
                children = []
            for child in children:
                if not child.is_dir() or child.name.startswith("."):
                    continue
                slug = _origin_slug(child) or child.name
                skill_dir = _locate_skill_md(child)
                items.append({
                    "slug": slug,
                    "dir": child,
                    "skill_dir": skill_dir,
                    "error": None if skill_dir is not None else "missing SKILL.md",
                })
        return items

    index = _installed_index()
    seen: set[str] = set()
    for raw in slugs:
        slug = str(raw).strip()
        if not slug or slug in seen:
            continue
        seen.add(slug)
        target = index.get(slug) or index.get(_safe_name(slug))
        if target is None:
            items.append({"slug": slug, "dir": None, "skill_dir": None, "error": "not installed"})
            continue
        skill_dir = _locate_skill_md(target)
        items.append({
            "slug": slug,
            "dir": target,
            "skill_dir": skill_dir,
            "error": None if skill_dir is not None else "missing SKILL.md",
        })
    return items


def _read_source(skill_dir: Path) -> dict:
    """Parse the source ``SKILL.md`` frontmatter + body.

    Raises :class:`ParseError` (caught per-skill) when the file is unreadable or
    does not carry valid YAML frontmatter.
    """
    skill_dir = Path(skill_dir)
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise ParseError("missing SKILL.md")

    try:
        text = skill_md.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        try:
            text = skill_md.read_text(encoding="utf-8", errors="replace")
        except Exception as exc:  # pragma: no cover - defensive
            raise ParseError(f"could not read SKILL.md: {exc}") from exc
    except OSError as exc:
        raise ParseError(f"could not read SKILL.md: {exc}") from exc

    # Parse the source frontmatter. A dirty/non-strict-YAML block (e.g. a
    # description containing a colon) must NOT fail the conversion:
    # _parse_frontmatter falls back to a line-based parse and still returns a
    # dict. A source SKILL.md with NO frontmatter block at all, however, is
    # unparseable and fails the conversion with a parse reason (Req 3.6) — only
    # a genuinely absent block yields None here.
    try:
        meta = _spec._parse_frontmatter(text)
    except Exception:
        meta = None
    if not isinstance(meta, dict):
        raise ParseError("SKILL.md has no valid YAML frontmatter")

    body = ""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            body = parts[2].lstrip("\n")

    origin: dict[str, Any] = {}
    for op in (skill_dir / ".clawhub" / "origin.json", skill_dir / "origin.json"):
        if op.exists():
            try:
                import json

                data = json.loads(op.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    origin = data
                    break
            except Exception:
                continue

    return {"frontmatter": meta, "body": body, "skill_dir": skill_dir, "origin": origin}


def _iter_files(skill_dir: Path) -> list[Path]:
    """All regular files under ``skill_dir`` (sorted by relative POSIX path)."""
    out: list[Path] = []
    for path in sorted(skill_dir.rglob("*")):
        if path.is_file():
            out.append(path)
    return sorted(out, key=lambda p: p.relative_to(skill_dir).as_posix())


def _source_hash(skill_dir: Path) -> str:
    """Stable SHA-256 over the sorted file list + bytes of the source skill."""
    skill_dir = Path(skill_dir)
    digest = hashlib.sha256()
    for path in _iter_files(skill_dir):
        rel = path.relative_to(skill_dir).as_posix()
        digest.update(rel.encode("utf-8"))
        digest.update(b"\0")
        try:
            digest.update(path.read_bytes())
        except OSError:
            digest.update(b"")
        digest.update(b"\0")
    return "sha256:" + digest.hexdigest()


# --------------------------------------------------------------------------- #
# 2.2 Mapping to the Hermes skill spec
# --------------------------------------------------------------------------- #
def _derive_description(frontmatter: dict, body: str, slug: str) -> str:
    """Carry over an existing description or derive one from the body/slug."""
    desc = frontmatter.get("description")
    if isinstance(desc, str) and desc.strip():
        return desc.strip()[: _spec.MAX_DESC_LEN]
    for line in (body or "").splitlines():
        stripped = line.strip().lstrip("#").strip()
        if stripped:
            return stripped[: _spec.MAX_DESC_LEN]
    return (f"Converted Hermes skill from {slug}")[: _spec.MAX_DESC_LEN]


def _enumerate_entrypoints(skill_dir: Path, frontmatter: dict) -> list[str]:
    """Enumerate script entrypoints as relative POSIX paths within ``skill_dir``."""
    skill_dir = Path(skill_dir)
    found: list[str] = []
    seen: set[str] = set()

    def _add(rel: str) -> None:
        rel = rel.replace("\\", "/").strip().lstrip("./")
        if not rel or rel in seen:
            return
        candidate = skill_dir / rel
        try:
            within = str(candidate.resolve()).startswith(str(skill_dir.resolve()))
        except Exception:
            within = False
        if within and candidate.exists() and candidate.is_file():
            seen.add(rel)
            found.append(rel)

    for declared in _spec._declared_entrypoints(frontmatter):
        _add(declared)

    if not found:
        for path in _iter_files(skill_dir):
            if path.name == "SKILL.md":
                continue
            if any(part.startswith(".") for part in path.relative_to(skill_dir).parts):
                continue
            if path.suffix.lower() in _SCRIPT_EXTS:
                _add(path.relative_to(skill_dir).as_posix())

    return sorted(found)


def _map_skill(source: dict, slug: str, source_hash: str) -> dict:
    """Build the produced Hermes ``SKILL.md`` content + provenance + entrypoints."""
    frontmatter = source.get("frontmatter") or {}
    body = source.get("body") or ""
    origin = source.get("origin") or {}
    skill_dir = source.get("skill_dir")

    raw_name = frontmatter.get("name") if isinstance(frontmatter.get("name"), str) else ""
    name = _spec.normalize_name(raw_name, slug)
    description = _derive_description(frontmatter, body, slug)
    entrypoints = _enumerate_entrypoints(skill_dir, frontmatter)

    market = origin.get("market") or get_settings().market
    version = frontmatter.get("version") or origin.get("version")
    converted_at = time.time()

    metadata = {
        "omnilimb_origin_market": market,
        "omnilimb_source_slug": slug,
        "omnilimb_source_version": version,
        "omnilimb_source_hash": source_hash,
        "omnilimb_converted_at": converted_at,
    }
    extra = {"entrypoints": entrypoints} if entrypoints else {}
    frontmatter_text = _spec.hermes_frontmatter(name, description, metadata, extra)
    content = frontmatter_text + "\n" + body if body else frontmatter_text + "\n"

    provenance_report = {
        "market": market,
        "source_slug": slug,
        "source_version": version,
        "converted_at": converted_at,
    }

    return {
        "name": name,
        "description": description,
        "entrypoints": entrypoints,
        "content": content,
        "provenance_report": provenance_report,
    }


def _map_skill_ai(source: dict, slug: str, source_hash: str, ai_doc: dict) -> dict:
    """Build the produced Hermes ``SKILL.md`` using AI-rewritten body/description.

    This mirrors :func:`_map_skill` but substitutes the human-readable
    ``description`` and the Markdown body with the AI_Curation output. Everything
    the AI must NOT influence is computed deterministically and stays identical
    to the rule-based mapping: the skill ``name`` (always ``normalize_name`` — the
    AI never names the skill), the enumerated script ``entrypoints``, and the
    provenance ``metadata`` block (Req 13.1, 13.2). Scripts themselves are copied
    byte-for-byte by :func:`_write_skill`; this function never touches them.
    """
    frontmatter = source.get("frontmatter") or {}
    origin = source.get("origin") or {}
    skill_dir = source.get("skill_dir")

    raw_name = frontmatter.get("name") if isinstance(frontmatter.get("name"), str) else ""
    name = _spec.normalize_name(raw_name, slug)
    entrypoints = _enumerate_entrypoints(skill_dir, frontmatter)

    ai_description = ""
    ai_body = ""
    if isinstance(ai_doc, dict):
        raw_desc = ai_doc.get("description")
        raw_body = ai_doc.get("body")
        if isinstance(raw_desc, str):
            ai_description = raw_desc.strip()
        if isinstance(raw_body, str):
            ai_body = raw_body
    description = ai_description[: _spec.MAX_DESC_LEN]
    body = ai_body

    market = origin.get("market") or get_settings().market
    version = frontmatter.get("version") or origin.get("version")
    converted_at = time.time()

    metadata = {
        "omnilimb_origin_market": market,
        "omnilimb_source_slug": slug,
        "omnilimb_source_version": version,
        "omnilimb_source_hash": source_hash,
        "omnilimb_converted_at": converted_at,
    }
    extra = {"entrypoints": entrypoints} if entrypoints else {}
    frontmatter_text = _spec.hermes_frontmatter(name, description, metadata, extra)
    content = frontmatter_text + "\n" + body if body else frontmatter_text + "\n"

    provenance_report = {
        "market": market,
        "source_slug": slug,
        "source_version": version,
        "converted_at": converted_at,
    }

    return {
        "name": name,
        "description": description,
        "entrypoints": entrypoints,
        "content": content,
        "provenance_report": provenance_report,
    }


def _script_excerpts(skill_dir: Path, entrypoints: list[str]) -> list[dict]:
    """Collect per-script excerpts (``{"path","excerpt"}``) for AI_Curation input.

    Reads each enumerated entrypoint from the SOURCE skill directory and truncates
    it to ``_ai_curate.AI_SCRIPT_EXCERPT_CHARS`` (the curate prompt builder applies
    the same cap defensively). Never raises; an unreadable script is listed by
    path with an empty excerpt. Source bytes are only read, never modified.
    """
    out: list[dict] = []
    skill_dir = Path(skill_dir)
    for rel in entrypoints or []:
        path = skill_dir / rel
        excerpt = ""
        try:
            if path.exists() and path.is_file():
                text = path.read_text(encoding="utf-8", errors="replace")
                excerpt = text[: _ai_curate.AI_SCRIPT_EXCERPT_CHARS]
        except Exception:
            excerpt = ""
        out.append({"path": rel, "excerpt": excerpt})
    return out


def _invoke_ai_curation(
    skill_dir: Path,
    source: dict,
    slug: str,
    entrypoints: list[str],
    ai_curate_fn: Callable[..., dict | None],
) -> dict | None:
    """Call ``ai_curate_fn`` with the source ``SKILL.md`` text + script excerpts.

    Reads the raw source ``SKILL.md`` (the exact bytes the author wrote, not the
    re-rendered mapping) and the per-script excerpts, then delegates to the
    injected curate callable. Returns its result (``{"description","body"}`` or
    ``None``). Never raises — any failure resolves to ``None`` so the caller falls
    back to the deterministic mapping (Req 13.1, 13.6).
    """
    source_md = ""
    try:
        skill_md = Path(skill_dir) / "SKILL.md"
        if skill_md.exists():
            source_md = skill_md.read_text(encoding="utf-8", errors="replace")
    except Exception:
        source_md = ""
    scripts = _script_excerpts(skill_dir, entrypoints)
    try:
        return ai_curate_fn(source_skill_md=source_md, scripts=scripts, slug=slug)
    except Exception:
        return None


def _candidate_passes_validation(skill_dir: Path, mapping: dict) -> bool:
    """Stage a produced skill and run the Req 5 structural Validator on it.

    Used to gate an AI_Curation candidate before it is accepted (Req 13.4): the
    candidate ``SKILL.md`` plus its entrypoints are written into a throwaway
    staging dir, validated, and the staging dir is removed. Returns ``True`` only
    when the Validator reports ``ok``. Never raises — any error resolves to
    ``False`` so the caller falls back to the deterministic mapping.
    """
    staging: Path | None = None
    try:
        staging = Path(tempfile.mkdtemp(prefix="omnilimb_aichk_"))
        (staging / "SKILL.md").write_text(mapping["content"], encoding="utf-8")
        for rel in mapping["entrypoints"]:
            src = Path(skill_dir) / rel
            if not src.exists():
                continue
            dst = staging / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
        validation = _spec.validate_skill(staging)
        return bool(validation.get("ok"))
    except Exception:
        return False
    finally:
        if staging is not None:
            shutil.rmtree(staging, ignore_errors=True)


# --------------------------------------------------------------------------- #
# 2.3 Output-root resolution, atomic write, cleanup
# --------------------------------------------------------------------------- #
def _hermes_home() -> Path:
    """Resolve the Hermes home via the plugin's single canonical resolver.

    Delegates to ``config.get_hermes_home`` (``hermes_constants.get_hermes_home``
    when running inside Hermes, ``~/.hermes`` as a standalone fallback) so the
    converted-skill output lands exactly where Hermes loads native skills — the
    same directory the dashboard scans and the uninstall route deletes from.
    """
    from .config import get_hermes_home

    return get_hermes_home()


def _resolve_output_root(output_dir: str | None) -> Path:
    """Resolve and writability-probe the output root.

    Returns the resolved root (explicit ``output_dir`` or the canonical
    ``config.hermes_skills_dir()``). Raises :class:`OutputError` when the
    resolved path cannot be created/written.
    """
    if output_dir:
        root = Path(str(output_dir)).expanduser()
    else:
        from .config import hermes_skills_dir

        root = hermes_skills_dir()
    try:
        root.mkdir(parents=True, exist_ok=True)
        probe = root / f".omnilimb_write_probe_{os.getpid()}"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
    except Exception as exc:
        raise OutputError(f"output directory not writable: {root} ({exc})") from exc
    return root


def _cleanup(skill_dir: Path) -> None:
    """Remove a partially written skill directory. Never raises."""
    try:
        skill_dir = Path(skill_dir)
        if skill_dir.exists():
            shutil.rmtree(skill_dir, ignore_errors=True)
    except Exception:
        pass


def _write_skill(skill_dir: Path, dest: Path, mapping: dict) -> tuple[dict, bool]:
    """Write the produced skill into a staging dir, validate, then move into place.

    Returns ``(validation, written)``. When structural validation fails the
    staging directory is removed, the destination is left untouched, and
    ``written`` is ``False``. Any IO error removes the staging directory and is
    re-raised for the per-skill handler to clean up.
    """
    staging = Path(tempfile.mkdtemp(prefix="omnilimb_conv_"))
    try:
        (staging / "SKILL.md").write_text(mapping["content"], encoding="utf-8")
        for rel in mapping["entrypoints"]:
            src = Path(skill_dir) / rel
            if not src.exists():
                continue
            dst = staging / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

        validation = _spec.validate_skill(staging)
        if not validation.get("ok"):
            shutil.rmtree(staging, ignore_errors=True)
            return validation, False

        dest = Path(dest)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        shutil.move(str(staging), str(dest))
        return validation, True
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


# --------------------------------------------------------------------------- #
# 2.4 Bounded Validation_Loop
# --------------------------------------------------------------------------- #
def _find_runnable_entry(skill_dir: Path) -> str | None:
    """Return the first declared entrypoint that has a usable interpreter."""
    skill_dir = Path(skill_dir)
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return None
    try:
        meta = _spec._parse_frontmatter(skill_md.read_text(encoding="utf-8"))
    except Exception:
        return None
    if not isinstance(meta, dict):
        return None
    try:
        from .backends.native_backend import NativeBackend
    except Exception:
        NativeBackend = None  # type: ignore
    for rel in _spec._declared_entrypoints(meta):
        rel = str(rel).replace("\\", "/").strip()
        if not rel:
            continue
        path = skill_dir / rel
        if not path.exists():
            continue
        if NativeBackend is None:
            return rel
        try:
            if NativeBackend._interpreter_for(path) is not None:
                return rel
        except Exception:
            continue
    return None


def _failure_detail(result: Any) -> str:
    """Extract a human-readable failure detail from a run result."""
    if isinstance(result, dict):
        for key in ("error", "stderr", "detail"):
            val = result.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
        return "run/test failed"
    return "run/test failed"


def _remediate(skill_dir: Path, entry: str, result: Any) -> str:
    """Apply a deterministic, rule-driven remediation before the next retry.

    The rule marks the failing entrypoint as documentation-only: it is removed
    from the runnable ``entrypoints`` list and recorded under
    ``metadata.omnilimb_doc_only``, which guarantees forward progress. Never
    LLM-generated. Returns a description of the applied remediation.
    """
    skill_dir = Path(skill_dir)
    skill_md = skill_dir / "SKILL.md"
    try:
        text = skill_md.read_text(encoding="utf-8")
        meta = _spec._parse_frontmatter(text)
        if not isinstance(meta, dict):
            return f"marked entrypoint doc-only: {entry}"
        body = ""
        if text.startswith("---"):
            parts = text.split("---", 2)
            if len(parts) >= 3:
                body = parts[2].lstrip("\n")

        name = meta.get("name") if isinstance(meta.get("name"), str) else "skill"
        desc = meta.get("description") if isinstance(meta.get("description"), str) else name
        metadata = dict(meta.get("metadata") or {})

        declared = meta.get("entrypoints")
        if isinstance(declared, str):
            declared = [declared]
        elif not isinstance(declared, list):
            declared = []
        normalized = entry.replace("\\", "/").strip()
        remaining = [
            e for e in declared
            if isinstance(e, str) and e.replace("\\", "/").strip() != normalized
        ]

        doc_only = list(metadata.get("omnilimb_doc_only") or [])
        if normalized not in doc_only:
            doc_only.append(normalized)
        metadata["omnilimb_doc_only"] = doc_only

        extra = {"entrypoints": remaining} if remaining else {}
        # preserve any other non-reserved top-level keys
        for key, value in meta.items():
            if key not in ("name", "description", "metadata", "entrypoints"):
                extra[key] = value

        frontmatter_text = _spec.hermes_frontmatter(name, desc, metadata, extra)
        new_content = frontmatter_text + "\n" + body if body else frontmatter_text + "\n"
        skill_md.write_text(new_content, encoding="utf-8")
    except Exception:
        # Even if the rewrite fails we still report the intended remediation;
        # the loop remains bounded by max_iterations.
        return f"marked entrypoint doc-only: {entry}"
    return f"marked entrypoint doc-only: {entry}"


def _validation_loop(
    skill_dir: Path,
    run_fn: Callable[[str, str, dict], dict],
    max_iterations: int,
) -> dict:
    """Bounded run -> test -> fix -> retest loop for one produced skill.

    Semantics (Req 6.3-6.6): the loop performs at most ``max_iterations``
    remediation iterations and always terminates. If the run/test step first
    succeeds after ``k`` remediations (``k <= max_iterations``) the result is
    ``final_status == "passed"`` with ``iterations == k``; if every attempt
    fails the result is ``final_status == "failed"`` with
    ``iterations == max_iterations`` and a non-empty ``last_failure``.
    """
    skill_dir = Path(skill_dir)
    slug = skill_dir.name
    try:
        max_iterations = int(max_iterations)
    except Exception:
        max_iterations = 0
    if max_iterations < 0:
        max_iterations = 0

    remediations: list[str] = []
    last_failure: Any = None

    # Re-evaluate the runnable entry EACH iteration. A skill that declares
    # nothing runnable — or whose failing entries have all been downgraded to
    # documentation-only by remediation — loads cleanly with nothing left to
    # execute and therefore passes. Re-finding the entry every loop is what
    # fixes the previous "repeat the same fix forever then fail" bug: once an
    # entry is marked doc-only it is removed from the declared entrypoints, so
    # the next lookup skips it and a script-only skill ends as a clean doc-only
    # conversion instead of a false failure.
    iterations = 0
    while True:
        entry = _find_runnable_entry(skill_dir)
        if entry is None:
            return {
                "iterations": iterations,
                "final_status": "passed",
                "remediations": remediations,
                "last_failure": None,
            }

        # Run the entry IN THE CONVERTED OUTPUT DIRECTORY — run_fn receives the
        # produced skill directory path, never a workspace slug.
        try:
            result = run_fn(str(skill_dir), entry, {})
        except Exception as exc:
            result = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

        ok = bool(result.get("ok")) if isinstance(result, dict) else bool(result)
        if ok:
            return {
                "iterations": iterations,
                "final_status": "passed",
                "remediations": remediations,
                "last_failure": None,
            }

        last_failure = _failure_detail(result)
        if iterations >= max_iterations:
            return {
                "iterations": max_iterations,
                "final_status": "failed",
                "remediations": remediations,
                "last_failure": last_failure,
            }

        remediations.append(_remediate(skill_dir, entry, result))
        iterations += 1


# --------------------------------------------------------------------------- #
# 2.5 Orchestration + report assembly
# --------------------------------------------------------------------------- #
def _default_run_fn(skill_dir, entry: str, args: dict) -> dict:
    """Default runner: execute ``entry`` INSIDE the converted output directory.

    ``skill_dir`` is the absolute path of the produced Hermes skill directory
    (NOT a workspace slug). Earlier this used ``NativeBackend().skill_run(slug=…)``,
    whose ``_skill_dir`` resolved the slug against the *workspace* skills root —
    so it looked for the entry in the wrong place and always reported
    "entry not found". We now resolve and run the entry against the actual
    produced directory, reusing only the interpreter detection + local runner.
    Injectable for tests; never raises.
    """
    try:
        import json as _json

        from .backends.native_backend import NativeBackend

        d = Path(skill_dir)
        entry_path = (d / entry).resolve()
        if not str(entry_path).startswith(str(d.resolve())):
            return {"ok": False, "error": "entry escapes skill directory"}
        if not entry_path.exists():
            return {"ok": False, "error": f"entry not found: {entry}"}
        interp = NativeBackend._interpreter_for(entry_path)
        if interp is None:
            return {"ok": False, "error": f"no interpreter for {entry_path.suffix or 'file'}"}
        argv = [*interp, str(entry_path)] if interp else [str(entry_path)]
        env = dict(os.environ)
        env["CLAW_SKILL_ARGS"] = _json.dumps(args or {})
        return NativeBackend()._local_run(
            argv, cwd=str(d), env=env, timeout_s=get_settings().default_timeout_s
        )
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}


def _benign_loop(*, failed: bool = False, detail: Any = None) -> dict:
    """A loop record for branches that do not run the Validation_Loop."""
    return {
        "iterations": 0,
        "final_status": "failed" if failed else "passed",
        "remediations": [],
        "last_failure": detail if failed else None,
    }


def _result(
    slug: str,
    *,
    ok: bool,
    status: str,
    name: str | None = None,
    mode: str = "deterministic",
    mode_requested: str = "deterministic",
    fell_back: bool = False,
    source_path: str | None = None,
    output_path: str | None = None,
    source_hash: str | None = None,
    entrypoints: list[str] | None = None,
    provenance: dict | None = None,
    validation: dict | None = None,
    loop: dict | None = None,
    reason: str | None = None,
) -> dict:
    """Assemble one ``results[]`` entry exactly per the design data model.

    Every entry carries the Conversion_Mode bookkeeping (Req 12.6, 13.7): ``mode``
    is the mode ACTUALLY used (``deterministic`` or ``ai_curated``),
    ``mode_requested`` is the normalised mode the caller asked for, and
    ``fell_back`` is ``True`` only when an ``ai_curated`` request fell back to the
    deterministic mapping. The design invariant ``fell_back is True`` implies
    ``mode == "deterministic"`` and ``mode_requested == "ai_curated"`` is upheld by
    the callers in :func:`_convert_one`.
    """
    entry = {
        "slug": slug,
        "ok": ok,
        "status": status,
        "name": name,
        "mode": mode,
        "mode_requested": mode_requested,
        "fell_back": bool(fell_back),
        "source_path": source_path,
        "output_path": output_path,
        "source_hash": source_hash,
        "entrypoints": list(entrypoints or []),
        "provenance": dict(provenance or {}),
        "validation": validation or {"ok": ok, "findings": []},
        "loop": loop or _benign_loop(failed=not ok),
    }
    if not ok and reason is not None:
        entry["reason"] = reason
    return entry


def _existing_source_hash(dest: Path) -> str | None:
    """Read ``metadata.omnilimb_source_hash`` from an existing produced skill."""
    skill_md = Path(dest) / "SKILL.md"
    if not skill_md.exists():
        return None
    try:
        meta = _spec._parse_frontmatter(skill_md.read_text(encoding="utf-8"))
        if isinstance(meta, dict):
            md = meta.get("metadata")
            if isinstance(md, dict):
                val = md.get("omnilimb_source_hash")
                return val if isinstance(val, str) else None
    except Exception:
        return None
    return None


def _convert_one(
    item: dict,
    output_root: Path,
    overwrite: bool,
    max_iterations: int,
    run_fn: Callable[[str, str, dict], dict],
    mode: str = "deterministic",
    ai_curate_fn: Callable[..., dict | None] | None = None,
) -> dict:
    """Convert a single discovered skill, isolating all failures.

    ``mode`` (already normalised by the caller) and ``ai_curate_fn`` are threaded
    through for the per-skill AI_Curation path. In ``deterministic`` mode the
    behaviour is identical to Requirements 3-8: the deterministic rule-based
    mapping is used and ``ai_curate_fn`` is never consulted.
    """
    slug = item["slug"]
    mode_requested = mode

    if item.get("dir") is None:
        return _result(
            slug, ok=False, status="error", reason="not installed",
            mode="deterministic", mode_requested=mode_requested, fell_back=False,
        )
    if item.get("skill_dir") is None:
        return _result(
            slug, ok=False, status="error",
            reason="missing SKILL.md", source_path=str(item["dir"]),
            mode="deterministic", mode_requested=mode_requested, fell_back=False,
        )

    skill_dir = Path(item["skill_dir"])

    try:
        source = _read_source(skill_dir)
    except ParseError as exc:
        return _result(
            slug, ok=False, status="error",
            reason=str(exc), source_path=str(skill_dir),
            mode="deterministic", mode_requested=mode_requested, fell_back=False,
        )

    dest: Path | None = None
    reconverted = False
    try:
        source_hash = _source_hash(skill_dir)
        mapping = _map_skill(source, slug, source_hash)
        name = mapping["name"]
        dest = output_root / name
        provenance = mapping["provenance_report"]
        entrypoints = mapping["entrypoints"]

        # Idempotence via source hash. Evaluated BEFORE any Language_Model call so
        # an unchanged source resolves to ``unchanged`` with NO new AI call
        # (Req 7.1, 7.2, 13.8). The mode bookkeeping records that this run made no
        # AI curation (``mode="deterministic"``, ``fell_back=False``).
        if dest.exists():
            existing = _existing_source_hash(dest)
            if existing == source_hash:
                return _result(
                    slug, ok=True, status="unchanged", name=name,
                    mode="deterministic", mode_requested=mode_requested, fell_back=False,
                    source_path=str(skill_dir), output_path=str(dest),
                    source_hash=source_hash, entrypoints=entrypoints,
                    provenance=provenance, validation={"ok": True, "findings": []},
                    loop=_benign_loop(),
                )
            if not overwrite:
                return _result(
                    slug, ok=True, status="skipped (exists)", name=name,
                    mode="deterministic", mode_requested=mode_requested, fell_back=False,
                    source_path=str(skill_dir), output_path=str(dest),
                    source_hash=source_hash, entrypoints=entrypoints,
                    provenance=provenance, validation={"ok": True, "findings": []},
                    loop=_benign_loop(),
                )
            reconverted = True

        # The deterministic mapping computed above is ALWAYS the fallback baseline.
        # In ``ai_curated`` mode (the batch License_Gate has already passed) we ask
        # the Language_Model to rewrite the documentation, build the AI candidate
        # via `_map_skill_ai`, and only adopt it once it passes the Req 5 Validator.
        # On any miss — AI returns None / raises / times out, or the candidate
        # fails structural validation — we silently keep the deterministic baseline
        # and record ``fell_back=true`` (Req 13.1, 13.4, 13.6).
        active_mapping = mapping
        mode_used = "deterministic"
        fell_back = False
        if mode == "ai_curated":
            ai_doc = _invoke_ai_curation(
                skill_dir, source, slug, entrypoints, ai_curate_fn or _ai_curate.curate
            )
            if (
                isinstance(ai_doc, dict)
                and isinstance(ai_doc.get("description"), str)
                and ai_doc.get("description").strip()
                and isinstance(ai_doc.get("body"), str)
                and ai_doc.get("body").strip()
            ):
                candidate = _map_skill_ai(source, slug, source_hash, ai_doc)
                if _candidate_passes_validation(skill_dir, candidate):
                    active_mapping = candidate
                    mode_used = "ai_curated"
                    name = candidate["name"]
                    provenance = candidate["provenance_report"]
                    entrypoints = candidate["entrypoints"]
                else:
                    fell_back = True
            else:
                fell_back = True

        validation, written = _write_skill(skill_dir, dest, active_mapping)
        if not written:
            # Structural validation failed in staging; destination untouched.
            return _result(
                slug, ok=False, status="failed", name=name,
                mode=mode_used, mode_requested=mode_requested, fell_back=fell_back,
                source_path=str(skill_dir), output_path=None,
                source_hash=source_hash, entrypoints=entrypoints,
                provenance=provenance, validation=validation,
                loop=_benign_loop(failed=True, detail="structural validation failed"),
                reason="structural validation failed",
            )

        loop = _validation_loop(dest, run_fn, max_iterations)
        loop_ok = loop.get("final_status") == "passed"
        if loop_ok:
            status = "reconverted" if reconverted else "passed"
            result = _result(
                slug, ok=True, status=status, name=name,
                mode=mode_used, mode_requested=mode_requested, fell_back=fell_back,
                source_path=str(skill_dir), output_path=str(dest),
                source_hash=source_hash, entrypoints=entrypoints,
                provenance=provenance, validation=validation, loop=loop,
            )
        else:
            result = _result(
                slug, ok=False, status="failed", name=name,
                mode=mode_used, mode_requested=mode_requested, fell_back=fell_back,
                source_path=str(skill_dir), output_path=str(dest),
                source_hash=source_hash, entrypoints=entrypoints,
                provenance=provenance, validation=validation, loop=loop,
                reason=loop.get("last_failure") or "run/test failed",
            )
        return result
    except Exception as exc:
        # Transactional cleanup: remove any partially written destination.
        if dest is not None:
            _cleanup(dest)
        return _result(
            slug, ok=False, status="error",
            reason=f"{type(exc).__name__}: {exc}", source_path=str(skill_dir),
            mode="deterministic", mode_requested=mode_requested, fell_back=False,
        )


def run_conversion(
    *,
    slugs: list[str] | None,
    output_dir: str | None = None,
    overwrite: bool = False,
    max_iterations: int | None = None,
    mode: str = "deterministic",
    run_fn: Callable[[str, str, dict], dict] | None = None,
    ai_curate_fn: Callable[..., dict | None] | None = None,
) -> dict:
    """Convert installed Source_Skills into native Hermes skills.

    Returns the Conversion_Report **dict** (not a JSON string). Never raises:
    the whole batch is wrapped in ``try/except`` and every skill is converted in
    its own ``try/except`` so one failure cannot abort the batch.

    ``mode`` selects the documentation strategy and is normalised so that any
    value other than exactly ``"deterministic"`` or ``"ai_curated"`` (including
    missing/empty/non-string) resolves to ``"deterministic"`` (Req 12.1, 12.2).
    When ``mode`` resolves to ``"ai_curated"`` the AI_Curation License_Gate
    (``require_pro("ai_convert")``) is evaluated ONCE at the batch boundary
    before any Language_Model call; if the gate is not covered the whole batch
    returns the Pro error dict (``ok=false`` + ``error`` + ``upgrade``) and no
    model call is made (Req 12.5). ``deterministic`` mode skips this gate
    entirely (Req 12.4) and never consults ``ai_curate_fn``.
    """
    results: list[dict] = []
    try:
        mode = _normalize_mode(mode)
        if ai_curate_fn is None:
            ai_curate_fn = _ai_curate.curate

        if max_iterations is None:
            max_iterations = get_settings().max_retries
        try:
            max_iterations = int(max_iterations)
        except Exception:
            max_iterations = get_settings().max_retries
        if max_iterations < 0:
            max_iterations = 0

        if run_fn is None:
            run_fn = _default_run_fn

        # AI_Curation License_Gate — evaluated ONCE at the batch boundary, before
        # any discovery-driven model call. An uncovered license returns the Pro
        # error dict for the WHOLE batch and makes NO Language_Model call
        # (Req 12.5). Deterministic mode never reaches this gate (Req 12.4).
        # TODO(pro): 临时停用 AI 梳理模式的 Pro 门禁，便于免费功能测试。统一完善 Pro 功能时恢复下面四行：
        # if mode == "ai_curated":
        #     gate = _licensing.require_pro("ai_convert")
        #     if gate is not None:
        #         return gate

        try:
            output_root = _resolve_output_root(output_dir)
        except OutputError as exc:
            return {"ok": False, "error": str(exc), "output_dir": None, "results": results, "count": 0}

        discovered = _discover(slugs)
        matched = [d for d in discovered if d.get("dir") is not None]
        if not matched:
            return {
                "ok": False,
                "error": "no matching installed skills",
                "output_dir": str(output_root),
                "results": [],
                "count": 0,
            }

        for item in discovered:
            results.append(
                _convert_one(
                    item, output_root, overwrite, max_iterations, run_fn,
                    mode, ai_curate_fn,
                )
            )

        ok = all(r.get("ok") for r in results) if results else False
        return {
            "ok": ok,
            "output_dir": str(output_root),
            "count": len(results),
            "results": results,
        }
    except Exception as exc:
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}", "results": results}
