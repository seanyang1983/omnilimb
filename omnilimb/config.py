"""Configuration & backend-mode switching for Omnilimb.

Resolution order (highest priority first):
1. Environment variables (OMNILIMB_*)
2. Hermes config.yaml -> `omnilimb:` section (profile-aware)
3. Built-in defaults

The single most important knob is `backend`:
    cli    -> use the real `openclaw` / `clawhub` CLIs (subprocess bridge)
    native -> use the decoupled Python substrate (no Node dependency)
    auto   -> cli if `openclaw` is on PATH, else native  (default)
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

try:  # Hermes is present at runtime; keep import optional for standalone tests.
    from hermes_constants import get_hermes_home  # type: ignore
except Exception:  # pragma: no cover - standalone fallback

    def get_hermes_home() -> Path:  # type: ignore
        return Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes"))


def hermes_skills_dir() -> Path:
    """The single canonical directory where native Hermes skills live.

    Resolved the SAME way Hermes core resolves its home
    (``hermes_constants.get_hermes_home``, with a standalone ``~/.hermes``
    fallback for tests), so the converter's output directory, the dashboard's
    converted-skill scan, and the uninstall route ALL agree with where Hermes
    actually loads native skills — regardless of how/where the plugin is
    installed. This is the one place to change skill storage layout.
    """
    return get_hermes_home() / "skills"


_VALID_BACKENDS = ("auto", "cli", "native")


def _load_yaml_section() -> dict[str, Any]:
    """Best-effort read of `omnilimb:` from the active profile's config.yaml."""
    try:
        import yaml  # type: ignore

        cfg_path = get_hermes_home() / "config.yaml"
        if not cfg_path.exists():
            return {}
        with open(cfg_path, encoding="utf-8") as fh:
            data = yaml.safe_load(fh) or {}
        section = data.get("omnilimb") or {}
        return section if isinstance(section, dict) else {}
    except Exception:
        return {}


def _env(name: str) -> str | None:
    val = os.environ.get(name)
    return val.strip() if val and val.strip() else None


def _overrides_path() -> Path:
    """UI-editable settings layer — written by the dashboard Settings page so we
    never have to rewrite (and risk mangling) the user's hand-authored config.yaml."""
    return get_hermes_home() / "omnilimb.overrides.json"


def _load_overrides() -> dict[str, Any]:
    try:
        import json

        p = _overrides_path()
        if p.exists():
            data = json.loads(p.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
    except Exception:
        pass
    return {}


def _as_bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


@dataclass
class Settings:
    """Resolved, immutable-ish view of plugin configuration."""

    backend: str = "auto"
    # Sandbox
    sandbox_enabled: bool = True
    sandbox_image: str = "python:3.12-slim"
    sandbox_network: bool = False
    default_timeout_s: int = 120
    # Retry / rollback
    max_retries: int = 2
    retry_backoff_s: float = 1.0
    rollback: bool = True
    # Skill registry / market (native backend)
    market: str = "clawhub"  # clawhub | skillhub
    registry_base_url: str = "https://clawhub.ai"
    skillhub_base_url: str = "https://api.skillhub.cn"
    workspace: str = ""  # default resolved lazily
    # Browser
    browser_headless: bool = True
    # Local fallback cache (offline-first; serves last success when upstream is down)
    cache_enabled: bool = True
    cache_max_age_s: int = 604800  # 7 days
    # Discover homepage cache (TTL-refreshed; the 4 leaderboards = 60 items)
    discover_ttl_s: int = 21600  # 6 hours
    discover_limit: int = 15     # items per leaderboard tab
    # Pro / open-core
    license_key: str = ""
    # Audit (Pro)
    audit_log: bool = False
    # Extra skill markets (user-defined): [{id,type,base_url,label}]
    extra_markets: list = field(default_factory=list)

    _raw_yaml: dict[str, Any] = field(default_factory=dict, repr=False)

    # -- derived -----------------------------------------------------------
    def resolved_backend(self) -> str:
        if self.backend == "cli":
            return "cli"
        if self.backend == "native":
            return "native"
        # auto
        try:
            from .backends.cli_backend import openclaw_binary

            return "cli" if openclaw_binary() is not None else "native"
        except Exception:
            return "native"

    def workspace_dir(self) -> Path:
        if self.workspace:
            return Path(self.workspace).expanduser()
        # mirror OpenClaw's default workspace
        return Path(os.environ.get("OPENCLAW_WORKSPACE", Path.home() / ".openclaw" / "workspace"))

    def state_dir(self) -> Path:
        d = get_hermes_home() / "omnilimb"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def is_pro(self) -> bool:
        from ._licensing import is_pro

        return is_pro(self.license_key)


def _build_settings() -> Settings:
    y = {**_load_yaml_section(), **_load_overrides()}  # overrides win over config.yaml

    backend = (_env("OMNILIMB_BACKEND") or str(y.get("backend", "auto"))).lower()
    if backend not in _VALID_BACKENDS:
        backend = "auto"

    return Settings(
        backend=backend,
        sandbox_enabled=_as_bool(y.get("sandbox_enabled"), True),
        sandbox_image=_env("OMNILIMB_SANDBOX_IMAGE")
        or str(y.get("sandbox_image", "python:3.12-slim")),
        sandbox_network=_as_bool(y.get("sandbox_network"), False),
        default_timeout_s=int(y.get("default_timeout_s", 120) or 120),
        max_retries=int(y.get("max_retries", 2) or 0),
        retry_backoff_s=float(y.get("retry_backoff_s", 1.0) or 0.0),
        rollback=_as_bool(y.get("rollback"), True),
        market=(_env("OMNILIMB_MARKET") or str(y.get("market", "clawhub"))).lower(),
        registry_base_url=(
            _env("CLAWHUB_REGISTRY")
            or str(y.get("registry_base_url", "https://clawhub.ai"))
        ).rstrip("/"),
        skillhub_base_url=(
            _env("SKILLHUB_REGISTRY")
            or str(y.get("skillhub_base_url", "https://api.skillhub.cn"))
        ).rstrip("/"),
        workspace=_env("OPENCLAW_WORKSPACE") or str(y.get("workspace", "")),
        browser_headless=_as_bool(y.get("browser_headless"), True),
        cache_enabled=_as_bool(y.get("cache_enabled"), True),
        cache_max_age_s=int(y.get("cache_max_age_s", 604800) or 604800),
        discover_ttl_s=int(y.get("discover_ttl_s", 21600) or 21600),
        discover_limit=int(y.get("discover_limit", 15) or 15),
        license_key=_env("OMNILIMB_LICENSE") or str(y.get("license_key", "")),
        audit_log=_as_bool(y.get("audit_log"), False),
        extra_markets=y.get("markets") if isinstance(y.get("markets"), list) else [],
        _raw_yaml=y,
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return _build_settings()


def reload_settings() -> Settings:
    """Drop the cache and rebuild (tests / `/exo` diagnostics)."""
    get_settings.cache_clear()
    try:
        from ._licensing import is_pro

        is_pro.cache_clear()  # re-evaluate license/revocation on settings reload
    except Exception:
        pass
    return get_settings()
