"""Omnilimb — Hermes plugin.

Turns OpenClaw / ClawHub's mature execution substrate (skill registry, local
sandbox, Playwright browser automation, multi-language runtimes, retry/rollback)
into a set of structured-JSON tools for Hermes.

Design:
- Hermes is the brain (LLM/conversation/memory/UI).
- Omnilimb is the hands/feet (deterministic execution). It NEVER calls an
  LLM itself -> zero extra model tokens on the execution path.
- Two interchangeable backends, switchable via config:
    * "cli"    -> shells out to the real `openclaw` / `clawhub` CLIs.
    * "native" -> a decoupled Python re-implementation (no Node dependency).
    * "auto"   -> cli if the `openclaw` binary is present, else native.

Every tool handler:
  - has signature `handler(args: dict, **kwargs) -> str`
  - ALWAYS returns a JSON string (success and error alike)
  - NEVER raises
"""

from __future__ import annotations

import logging

from . import schemas, tools
from .config import get_settings

logger = logging.getLogger(__name__)

__version__ = "1.0.0"


def _cli_available() -> bool:
    """check_fn used to hide CLI-only behaviour gracefully (never raises)."""
    try:
        from .backends.cli_backend import openclaw_binary

        return openclaw_binary() is not None
    except Exception:  # pragma: no cover - defensive
        return False


def _tools_available() -> bool:
    """Tools are available whenever a backend can be resolved.

    The CLI backend needs the `openclaw` binary; the native backend always
    resolves. So tools are available unless the user pinned `backend: cli`
    without installing the CLI.
    """
    try:
        settings = get_settings()
        if settings.backend == "cli":
            return _cli_available()
        return True
    except Exception:  # pragma: no cover - defensive
        return True


def register(ctx) -> None:
    """Entry point called once at startup. Wires schemas -> handlers.

    If this function raises, Hermes disables the plugin but keeps running, so we
    keep it defensive and side-effect-light.
    """
    pairs = (
        ("claw_skill_search", schemas.CLAW_SKILL_SEARCH, tools.claw_skill_search),
        ("claw_skill_install", schemas.CLAW_SKILL_INSTALL, tools.claw_skill_install),
        ("claw_skill_list", schemas.CLAW_SKILL_LIST, tools.claw_skill_list),
        ("claw_skill_runs", schemas.CLAW_SKILL_RUNS, tools.claw_skill_runs),
        ("claw_skill_run", schemas.CLAW_SKILL_RUN, tools.claw_skill_run),
        ("claw_sandbox_exec", schemas.CLAW_SANDBOX_EXEC, tools.claw_sandbox_exec),
        ("claw_browser", schemas.CLAW_BROWSER, tools.claw_browser),
        ("claw_runtime", schemas.CLAW_RUNTIME, tools.claw_runtime),
        ("claw_pack_list", schemas.CLAW_PACK_LIST, tools.claw_pack_list),
        ("claw_pack_install", schemas.CLAW_PACK_INSTALL, tools.claw_pack_install),
        ("claw_skill_update", schemas.CLAW_SKILL_UPDATE, tools.claw_skill_update),
        ("claw_skill_to_hermes", schemas.CLAW_SKILL_TO_HERMES, tools.claw_skill_to_hermes),
        ("claw_skill_learn", schemas.CLAW_SKILL_LEARN, tools.claw_skill_learn),
    )

    for name, schema, handler in pairs:
        ctx.register_tool(
            name=name,
            toolset="omnilimb",
            schema=schema,
            handler=handler,
            check_fn=_tools_available,
        )

    # Ship an opt-in "how to drive me" skill. Not in the system-prompt index,
    # so it costs zero standing tokens until the agent explicitly loads it.
    try:
        from pathlib import Path

        skill_md = Path(__file__).parent / "skills" / "omnilimb" / "SKILL.md"
        if skill_md.exists():
            ctx.register_skill("omnilimb", skill_md)
    except Exception as exc:  # pragma: no cover - optional
        logger.debug("omnilimb: skill registration skipped: %s", exc)

    # Diagnostics slash command: /exo status
    try:
        ctx.register_command(
            "exo",
            handler=tools.slash_claw,
            description="Omnilimb status / backend / packs info",
            args_hint="[status|backend|doctor|packs]",
        )
    except Exception as exc:  # pragma: no cover - optional
        logger.debug("omnilimb: slash command skipped: %s", exc)

    s = get_settings()
    logger.info(
        "omnilimb v%s registered (backend=%s, resolved=%s, pro=%s)",
        __version__,
        s.backend,
        s.resolved_backend(),
        s.is_pro(),
    )
