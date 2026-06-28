# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versioning is [SemVer](https://semver.org/).

## [1.0.1] - 2026-06-28

Docs & packaging only — no code or API changes.

### Changed
- README (EN + 简体中文) restructured to mirror the omnilimb.com layout: three
  value pillars (zero extra tokens / deterministic & safe / convert & learn)
  plus features grouped into **Run community skills / Execute safely / Convert &
  learn**, with the value hook added and the dormant-licensing detail trimmed.
- Dashboard-tab descriptions and screenshots refreshed to the shipped 1.0 UI
  (Skill butler first, My skills, 审查, Update, 全部体检); image URLs pinned for
  stable rendering on GitHub and PyPI.

## [1.0.0] - 2026-06-28

**Open 1.0 — everything is free.** The previous open-core split is gone: every
tool and every dashboard feature now ships unlocked, under MIT.

### Added
- **`claw_skill_learn`** — distill a native Hermes skill from **any** source
  (a local path / file, a URL, or pasted text), authored to Hermes' skill
  standards (one-sentence description, modern section order, validated and
  written transactionally; idempotent by source hash). The open-ended `/learn`.
- **Skill → native Hermes conversion** (`claw_skill_to_hermes`) is now free,
  with a deterministic mode and an AI-curated mode (configurable model, with a
  deterministic fallback) — both behind a structural validation loop.
- `claw_pack_install` (curated skill packs), `claw_skill_update` (re-resolve +
  reinstall stale skills) are now free.

### Changed
- **All tiers removed.** No license, nothing to buy. The optional
  `OMNILIMB_LICENSE` / Ed25519 machinery is retained but dormant (only re-engages
  if `OMNILIMB_ENFORCE_LICENSE=1` is set for a downstream commercial build).
- **Dashboard rebuilt for the Hermes v0.17.0 plugin SDK** — host React (no
  bundled React). Tabs: **技能管家 (Skill butler)** — the default view, a
  deterministic no-LLM butler (health-check / recommend / diagnose / scan
  audit) with a *learn from any source* form built in; **Search** (with a
  Discover mode — leaderboards, market toggle, categories — plus one-click
  **全部体检** / health-check all that scores every result before install);
  **Installed** (per-skill 体检 health score, readiness, credentials,
  SKILL.md view/edit, smoke test, a one-click **Update**, **→ Hermes** convert,
  export/import); **My skills (我的技能)** (the native skills you've converted
  and learned, tagged by origin); **Favorites**; **审查 (Audit)**; and
  **Settings** (with a compact overview). Bilingual (EN / 简体中文).

### Fixed
- AI curation never ran for hyphenated model providers (e.g. `opencode-zen`):
  env-var lookups now normalize the provider id, so AI-curated conversion and
  learn work. The Settings sandbox toggle now persists. The butler's "recommend"
  action serves from the prewarmed discovery cache (instant).

## [0.8.0] - 2026-06-12

First public release — the **free community edition**, licensed under MIT.

> A future stable version will adopt an AGPLv3 + commercial dual-license.

### Added
- Eight structured-JSON tools for Hermes: `claw_skill_search`,
  `claw_skill_install`, `claw_skill_run`, `claw_sandbox_exec`, `claw_browser`,
  `claw_runtime`, `claw_skill_list`, `claw_skill_runs`.
- Dual, switchable backends: `cli` (openclaw/clawhub bridge) and `native`
  (decoupled Python substrate), with `auto` detection.
- Multi-market registry layer: `clawhub`, `skillhub` (api.skillhub.cn),
  `clawhub-cn` (official China mirror), and `skillsmp` (GitHub index), plus
  user-defined markets via `omnilimb.markets` config.
- Retry + rollback wrapper; Docker sandbox with implicit rollback and local
  fallback; Playwright browser automation via a structured action list.
- Local SQLite cache with offline-first fallback for search and discovery.
- Per-skill health check / scoring, credential management, environment-readiness
  checks, smoke test, run history, favorites, search history, and an optional
  JSONL audit log.
- Dashboard UI tab (Search / Installed / Favorites / Audit / Settings) following
  the native plugin-UI contract, with FastAPI routes under `/api/plugins/omnilimb/`.
- Packaging via the `hermes_agent.plugins` entry point and a directory-drop install.

### Notes
- Commercial/Pro capabilities (skill → native Hermes conversion, AI curation,
  curated-pack install, auto-update, the assistant console) are **not** part of
  this community edition and are planned for a future Pro release under a
  separate license.
