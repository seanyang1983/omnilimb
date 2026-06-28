"""Tool schemas — what the Hermes LLM reads to decide when to call each tool.

Descriptions are deliberately specific (when + how) and avoid naming tools from
other toolsets, per Hermes' schema rules.
"""

from __future__ import annotations

CLAW_SKILL_SEARCH = {
    "name": "claw_skill_search",
    "description": (
        "Search the ClawHub skill registry for installable OpenClaw skills. "
        "Use this to discover a skill that performs a concrete task (e.g. 'slack', "
        "'pdf', 'github release') before installing it. Returns slugs, names, "
        "verification status, and a short Skill Card summary."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Keywords to search for"},
            "limit": {
                "type": "integer",
                "description": "Max results per page (default 12)",
            },
            "page": {"type": "integer", "description": "1-based page number (default 1)"},
            "category": {
                "type": "string",
                "description": "Filter by market category slug (SkillHub; optional)",
            },
            "sort": {
                "type": "string",
                "description": "Sort order: relevance | downloads | stars | latest (default relevance)",
            },
        },
        "required": ["query"],
    },
}

CLAW_SKILL_INSTALL = {
    "name": "claw_skill_install",
    "description": (
        "Install a skill from ClawHub (or a git repo) into the workspace. Verifies "
        "the trust envelope (Skill Card) by default and reports any missing required "
        "binaries. Accepts a ClawHub slug ('owner/skill'), 'git:owner/repo@ref', or a "
        "local path. Run this before claw_skill_run."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "ClawHub slug, 'git:owner/repo@ref', or local path",
            },
            "verify": {
                "type": "boolean",
                "description": "Verify the trust envelope before enabling (default true)",
            },
            "global_install": {
                "type": "boolean",
                "description": "Install for all local agents instead of this workspace (default false)",
            },
            "git_fallback": {
                "type": "boolean",
                "description": (
                    "If the registry cannot resolve the slug, try cloning "
                    "github.com/<slug> as a last resort (default false)"
                ),
            },
        },
        "required": ["slug"],
    },
}

CLAW_SKILL_LIST = {
    "name": "claw_skill_list",
    "description": (
        "List the skills currently installed in the workspace, with their slug, "
        "version, and source market. Use this to see what is already available "
        "before searching or installing."
    ),
    "parameters": {"type": "object", "properties": {}},
}

CLAW_SKILL_RUNS = {
    "name": "claw_skill_runs",
    "description": (
        "Read the run history of installed skills (Pro). Returns newest-first run "
        "records (timestamp, entry, ok, duration, error) plus a summary (total, "
        "success rate, average duration). Use to diagnose a flaky or failing skill."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {"type": "string", "description": "Filter to one installed skill (optional)"},
            "limit": {"type": "integer", "description": "Max records to return (default 50)"},
            "only_failed": {"type": "boolean", "description": "Only return failed runs (default false)"},
        },
    },
}

CLAW_SKILL_RUN = {
    "name": "claw_skill_run",
    "description": (
        "Deterministically execute a script/entrypoint that ships with an installed "
        "skill — no LLM involved. Use for skills whose value is an executable script "
        "or CLI. For pure-prose skills, read the SKILL.md instead and act on it "
        "yourself. Runs inside the sandbox by default with retry + rollback."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {"type": "string", "description": "Installed skill slug"},
            "entry": {
                "type": "string",
                "description": "Script/entry relative to the skill dir (e.g. 'scripts/send.py')",
            },
            "args": {
                "type": "object",
                "description": "Arguments passed to the entrypoint (skill-specific)",
            },
            "sandbox": {
                "type": "boolean",
                "description": "Run inside the isolated sandbox (default true)",
            },
        },
        "required": ["slug", "entry"],
    },
}

CLAW_SANDBOX_EXEC = {
    "name": "claw_sandbox_exec",
    "description": (
        "Run a shell command inside an isolated sandbox (Docker when available) with "
        "configurable network access, a timeout, and automatic rollback on failure. "
        "Use for risky or untrusted commands you want isolated from the host."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "command": {"type": "string", "description": "Shell command to execute"},
            "image": {
                "type": "string",
                "description": "Container image (default from config, e.g. 'python:3.12-slim')",
            },
            "timeout_s": {"type": "integer", "description": "Timeout in seconds (default 120)"},
            "network": {
                "type": "boolean",
                "description": "Allow network egress (default false)",
            },
            "workdir": {"type": "string", "description": "Optional working directory to mount"},
        },
        "required": ["command"],
    },
}

CLAW_BROWSER = {
    "name": "claw_browser",
    "description": (
        "Drive a headless browser with Playwright using a structured sequence of "
        "actions (goto, click, fill, wait, extract, screenshot). Use for web "
        "automation, scraping, and form filling. Returns per-action results plus "
        "optional screenshot/HAR paths."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "actions": {
                "type": "array",
                "description": (
                    "Ordered actions. Each is an object with ONE of: "
                    "{'goto': url}, {'click': selector}, {'fill': [selector, value]}, "
                    "{'wait': selector_or_ms}, {'extract': selector}, {'screenshot': true}, "
                    "{'eval': js}."
                ),
                "items": {"type": "object"},
            },
            "headless": {"type": "boolean", "description": "Run headless (default true)"},
        },
        "required": ["actions"],
    },
}

CLAW_PACK_LIST = {
    "name": "claw_pack_list",
    "description": (
        "List the available curated skill packs (vendor-verified bundles of "
        "ClawHub skills grouped by use case). Free to browse; installing a pack "
        "needs a Pro license."
    ),
    "parameters": {"type": "object", "properties": {}},
}

CLAW_PACK_INSTALL = {
    "name": "claw_pack_install",
    "description": (
        "Install a curated skill pack (a vetted bundle of ClawHub skills) by name. "
        "Use claw_pack_list first to see available packs."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "pack": {"type": "string", "description": "Pack name, e.g. 'devops'"},
            "global_install": {
                "type": "boolean",
                "description": "Install for all local agents (default false)",
            },
        },
        "required": ["pack"],
    },
}

CLAW_SKILL_UPDATE = {
    "name": "claw_skill_update",
    "description": (
        "Update installed ClawHub skills to their latest version. "
        "Pass a slug to update one, or all=true to update every installed skill."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {"type": "string", "description": "Installed skill slug to update"},
            "all": {"type": "boolean", "description": "Update all installed skills"},
        },
    },
}

CLAW_RUNTIME = {
    "name": "claw_runtime",
    "description": (
        "Execute a short snippet in a language runtime (python, node, bash, ruby, go) "
        "for quick computation, parsing, or glue logic. Returns stdout/stderr/exit_code. "
        "For longer or risky work prefer claw_sandbox_exec."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "lang": {
                "type": "string",
                "description": "Runtime: python | node | bash | ruby | go",
            },
            "code": {"type": "string", "description": "Source code to run"},
            "timeout_s": {"type": "integer", "description": "Timeout in seconds (default 60)"},
        },
        "required": ["lang", "code"],
    },
}

CLAW_SKILL_TO_HERMES = {
    "name": "claw_skill_to_hermes",
    "description": (
        "Convert installed OpenClaw/ClawHub/SkillHub skills into native Hermes "
        "skills, then run+test each conversion and auto-fix until it loads or "
        "fails clearly. Omit slug(s) to convert everything installed."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "Single installed skill slug to convert",
            },
            "slugs": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Installed skill slugs to convert (omit for all)",
            },
            "output_dir": {
                "type": "string",
                "description": "Where to write Hermes skills (default HERMES_HOME/skills)",
            },
            "overwrite": {
                "type": "boolean",
                "description": "Replace an existing converted skill when the source changed (default false)",
            },
            "max_iterations": {
                "type": "integer",
                "description": "Max run→test→fix→retest iterations per skill (default config max_retries)",
            },
            "mode": {
                "type": "string",
                "enum": ["deterministic", "ai_curated"],
                "description": (
                    "Conversion mode: 'deterministic' (default, free) or 'ai_curated' "
                    "(Pro — rewrites SKILL.md docs with a model, scripts untouched)"
                ),
            },
        },
    },
}

CLAW_SKILL_LEARN = {
    "name": "claw_skill_learn",
    "description": (
        "Learn a reusable native Hermes skill from ANY source — a local "
        "directory or file path, a URL, or pasted text — and save it to "
        "HERMES_HOME/skills. Open-ended equivalent of Hermes '/learn': it "
        "gathers the source, authors a SKILL.md to the Hermes authoring "
        "standards (one-sentence description <=60 chars, modern section order, "
        "author Hermes), validates it, and writes it transactionally. Use "
        "mode='ai_curated' (default) to have the configured model write the "
        "docs; 'deterministic' for a no-model, offline draft."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "source": {
                "type": "string",
                "description": "What to learn from: a local dir/file path, an http(s) URL, or pasted text.",
            },
            "source_type": {
                "type": "string",
                "enum": ["auto", "path", "url", "text"],
                "description": "Force the source kind; 'auto' (default) detects it.",
            },
            "mode": {
                "type": "string",
                "enum": ["ai_curated", "deterministic"],
                "description": "'ai_curated' (default) writes docs with the model; 'deterministic' is offline, no model.",
            },
            "name": {
                "type": "string",
                "description": "Optional skill name override (else derived from the source).",
            },
            "overwrite": {
                "type": "boolean",
                "description": "Replace an existing skill of the same name (default true).",
            },
            "output_dir": {
                "type": "string",
                "description": "Where to write the skill (default HERMES_HOME/skills).",
            },
        },
        "required": ["source"],
    },
}
