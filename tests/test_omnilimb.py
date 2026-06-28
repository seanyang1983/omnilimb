"""Tests for Omnilimb (free community edition). stdlib + pytest + mock only.
No live network/Node/Docker."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest import mock

import pytest

# Make the package importable when running from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from omnilimb import schemas, tools  # noqa: E402
from omnilimb._retry import with_retry  # noqa: E402
from omnilimb.backends import cli_backend, native_backend  # noqa: E402
from omnilimb.config import reload_settings  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh(monkeypatch):
    # Force native backend and isolate config for every test.
    monkeypatch.setenv("OMNILIMB_BACKEND", "native")
    monkeypatch.delenv("OMNILIMB_MARKET", raising=False)
    reload_settings()
    from omnilimb.backends import reset_backend

    reset_backend()
    yield


# --- schemas --------------------------------------------------------------
def test_all_schemas_well_formed():
    for s in (
        schemas.CLAW_SKILL_SEARCH,
        schemas.CLAW_SKILL_INSTALL,
        schemas.CLAW_SKILL_RUN,
        schemas.CLAW_SANDBOX_EXEC,
        schemas.CLAW_BROWSER,
        schemas.CLAW_RUNTIME,
    ):
        assert s["name"]
        assert len(s["description"]) > 20
        assert s["parameters"]["type"] == "object"
        assert "required" in s["parameters"]


# --- handler contract: always JSON string, never raises -------------------
@pytest.mark.parametrize(
    "handler,args",
    [
        (tools.claw_skill_search, {}),
        (tools.claw_skill_install, {}),
        (tools.claw_skill_run, {"slug": "x"}),
        (tools.claw_sandbox_exec, {}),
        (tools.claw_browser, {"actions": []}),
        (tools.claw_runtime, {"lang": "python"}),
    ],
)
def test_handlers_validate_and_return_json(handler, args):
    out = handler(args)
    assert isinstance(out, str)
    payload = json.loads(out)
    assert payload["ok"] is False  # missing required args


def test_runtime_executes_python():
    out = tools.claw_runtime({"lang": "python", "code": "print(6*7)"})
    payload = json.loads(out)
    assert payload["ok"] is True
    assert "42" in payload["stdout"]


def test_runtime_unsupported_lang():
    payload = json.loads(tools.claw_runtime({"lang": "brainfuck", "code": "+"}))
    assert payload["ok"] is False


# --- tool registration: 1.0 surface — everything free --------------------
def test_all_tools_present_and_free():
    # In 1.0 every tool ships free, including the formerly-Pro ones
    # (convert / packs / update) and the new open-ended learn tool.
    for name in (
        "claw_skill_search", "claw_skill_run", "claw_runtime",
        "claw_skill_list", "claw_skill_runs",
        "claw_skill_to_hermes", "claw_skill_learn",
        "claw_pack_install", "claw_pack_list", "claw_skill_update",
    ):
        assert callable(getattr(tools, name)), name


# --- backend resolution ---------------------------------------------------
def test_backend_resolution_native(monkeypatch):
    monkeypatch.setenv("OMNILIMB_BACKEND", "native")
    assert reload_settings().resolved_backend() == "native"


def test_backend_auto_uses_cli_when_binary_present(monkeypatch):
    monkeypatch.setenv("OMNILIMB_BACKEND", "auto")
    reload_settings()
    with mock.patch("omnilimb.backends.cli_backend.openclaw_binary", return_value="/usr/bin/openclaw"):
        assert reload_settings().resolved_backend() == "cli"


# --- retry / rollback -----------------------------------------------------
def test_retry_succeeds_after_transient():
    calls = {"n": 0}

    def op():
        calls["n"] += 1
        if calls["n"] < 2:
            return {"ok": False, "error": "connection reset"}
        return {"ok": True}

    res = with_retry(op, retries=3, backoff_s=0)
    assert res["ok"] is True
    assert calls["n"] == 2


def test_retry_non_retryable_stops_and_marks_rollback():
    res = with_retry(lambda: {"ok": False, "error": "bad slug"}, retries=3, backoff_s=0)
    assert res["ok"] is False
    assert res["rolled_back"] is True


# --- cross-platform execution --------------------------------------------
def test_shell_argv_per_platform(monkeypatch):
    monkeypatch.setattr(native_backend, "_IS_WIN", True)
    assert native_backend._shell_argv("echo hi")[:2] == ["cmd", "/c"]
    monkeypatch.setattr(native_backend, "_IS_WIN", False)
    assert native_backend._shell_argv("echo hi")[:2] == ["sh", "-c"]


def test_interpreter_for_known_ext(tmp_path):
    f = tmp_path / "run.py"
    f.write_text("print(1)")
    assert native_backend.NativeBackend._interpreter_for(f) == ["python"]


def test_sandbox_exec_local_fallback_without_docker(monkeypatch):
    # Pretend docker is absent so we exercise the platform-aware local fallback.
    real_which = native_backend._which
    monkeypatch.setattr(
        native_backend, "_which",
        lambda name: None if name == "docker" else real_which(name),
    )
    out = json.loads(tools.claw_sandbox_exec({"command": "echo omnilimb_ok"}))
    assert out["ok"] is True
    assert out["sandboxed"] is False
    assert "omnilimb_ok" in out["stdout"]


# --- CLI backend argv construction (mocked subprocess) -------------------
def test_cli_search_builds_correct_argv(monkeypatch):
    captured = {}

    def fake_run(argv, **kw):
        captured["argv"] = argv
        return {"ok": True, "json": {"skills": []}}

    monkeypatch.setattr(cli_backend, "openclaw_binary", lambda: "openclaw")
    monkeypatch.setattr(cli_backend, "_run_cli", fake_run)
    cli_backend.CliBackend().skill_search(query="calendar", limit=5)
    assert captured["argv"] == ["openclaw", "skills", "search", "calendar", "--limit", "5", "--json"]


def test_cli_verify_has_no_json_flag(monkeypatch):
    calls = []

    def fake_run(argv, **kw):
        calls.append(argv)
        return {"ok": True, "json": {}}

    monkeypatch.setattr(cli_backend, "openclaw_binary", lambda: "openclaw")
    monkeypatch.setattr(cli_backend, "_run_cli", fake_run)
    cli_backend.CliBackend().skill_install(slug="owner/skill", verify=True, global_install=False)
    install_argv, verify_argv = calls[0], calls[1]
    assert install_argv == ["openclaw", "skills", "install", "owner/skill", "--json"]
    assert verify_argv == ["openclaw", "skills", "verify", "owner/skill"]  # no --json


# --- registry adapter layer (multi-market) -------------------------------
class _FakeReg:
    id = "clawhub"

    def __init__(self, result):
        self._result = result

    def base(self):
        return "https://x"

    def search(self, query, limit, *, page=1, category=None, sort=None):
        return self._result


def test_native_search_via_registry(monkeypatch):
    reg = _FakeReg({"ok": True, "skills": [
        {"slug": "gifgrep", "displayName": "GifGrep", "owner": "steipete", "version": "1.2.3"},
    ]})
    monkeypatch.setattr(native_backend, "get_registry", lambda: reg)
    out = json.loads(tools.claw_skill_search({"query": "gif", "limit": 5}))
    assert out["ok"] is True
    assert out["count"] == 1
    assert out["market"] == "clawhub"
    assert out["skills"][0]["slug"] == "gifgrep"


def test_native_search_error_propagates(monkeypatch):
    reg = _FakeReg({"ok": False, "error": "HTTP 404: not found", "status": 404})
    monkeypatch.setattr(native_backend, "get_registry", lambda: reg)
    out = json.loads(tools.claw_skill_search({"query": "nope"}))
    assert out["ok"] is False
    assert "404" in out["error"]
    assert "hint" in out


def test_registry_selection_and_base(monkeypatch):
    from omnilimb import registries

    monkeypatch.setenv("CLAWHUB_REGISTRY", "https://example.test/")
    monkeypatch.setenv("OMNILIMB_MARKET", "clawhub")
    reload_settings()
    assert registries.get_registry().id == "clawhub"
    assert registries.get_registry().base() == "https://example.test"

    monkeypatch.setenv("OMNILIMB_MARKET", "skillhub")
    reload_settings()
    assert registries.get_registry().id == "skillhub"
    assert registries.get_registry().base() == "https://api.skillhub.cn"


def test_dashboard_manifest_is_valid():
    root = Path(__file__).resolve().parents[1] / "omnilimb" / "dashboard"
    manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8"))
    assert manifest["name"] == "omnilimb"
    assert manifest["tab"]["path"] == "/omnilimb"
    # declared entry/api/css files must exist on disk
    assert (root / manifest["entry"]).exists()
    assert (root / manifest["api"]).exists()
    assert (root / manifest["css"]).exists()


def test_skillhub_search_parses_list(monkeypatch):
    from omnilimb import registries

    monkeypatch.setenv("OMNILIMB_MARKET", "skillhub")
    reload_settings()
    sample = {"ok": True, "data": {"data": {"total": 1, "skills": [
        {"slug": "smart-poi", "name": "智能景点", "description_zh": "推荐景点",
         "version": "1.0.0", "verified": True, "ownerName": "tx", "homepage": "h"},
    ]}}}
    monkeypatch.setattr(registries, "http_json", lambda *a, **k: sample)
    out = registries.SkillHubRegistry().search("景点", 5)
    assert out["ok"] is True
    assert out["skills"][0]["slug"] == "smart-poi"
    assert out["skills"][0]["displayName"] == "智能景点"


# --- usage tracking + installed list -------------------------------------
def test_skill_run_records_usage(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    tools.claw_skill_run({"slug": "demo-skill", "entry": "x.py"})
    usage = tools.read_usage()
    assert usage.get("demo-skill", {}).get("count", 0) >= 1
    assert "last_ts" in usage.get("demo-skill", {})


def test_skill_list_returns_ok(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.setenv("OPENCLAW_WORKSPACE", str(tmp_path / "ws"))
    reload_settings()
    out = json.loads(tools.claw_skill_list({}))
    assert out["ok"] is True
    assert isinstance(out.get("skills"), list)


# --- search enhancements --------------------------------------------------
def test_sort_skills_by_downloads():
    from omnilimb import registries

    items = [{"slug": "a", "downloads": 5}, {"slug": "b", "downloads": 50}, {"slug": "c"}]
    out = registries.sort_skills(items, "downloads")
    assert [s["slug"] for s in out] == ["b", "a", "c"]
    assert registries.sort_skills(items, "relevance") == items
    assert registries.sort_skills(items, None) == items


def test_skillhub_search_passes_category_and_paginates(monkeypatch):
    from omnilimb import registries

    captured = {}

    def fake_json(url, **kw):
        captured["url"] = url
        return {"ok": True, "data": {"data": {"total": 42, "skills": [
            {"slug": "x", "name": "X", "downloads": 9, "category": "dev", "verified": True},
        ]}}}

    monkeypatch.setattr(registries, "http_json", fake_json)
    out = registries.SkillHubRegistry().search("q", 12, page=2, category="dev", sort="downloads")
    assert out["ok"] is True
    assert out["total"] == 42
    assert out["skills"][0]["category"] == "dev"
    assert "page=2" in captured["url"] and "category=dev" in captured["url"]


# --- local fallback cache (offline-first) --------------------------------
def test_cache_serves_stale_on_failure(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    from omnilimb import _cache

    def op_ok():
        return {"ok": True, "skills": [{"slug": "x"}], "total": 1}

    def op_fail():
        return {"ok": False, "error": "unreachable: boom", "retryable": True}

    key = _cache.make_key("search", "skillhub", "git")
    r1 = _cache.cached(key, op_ok, enabled=True)
    assert r1["ok"] is True and not r1.get("from_cache")
    r2 = _cache.cached(key, op_fail, enabled=True)
    assert r2["ok"] is True
    assert r2["from_cache"] is True and r2["stale"] is True
    assert r2["skills"][0]["slug"] == "x"


def test_cache_disabled_passes_through(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    from omnilimb import _cache

    r = _cache.cached("k", lambda: {"ok": False, "error": "x"}, enabled=False)
    assert r["ok"] is False


def test_native_search_falls_back_to_cache(monkeypatch, tmp_path):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()

    class Reg:
        id = "skillhub"
        def __init__(self): self.fail = False
        def base(self): return "https://x"
        def search(self, query, limit, *, page=1, category=None, sort=None):
            if self.fail:
                return {"ok": False, "error": "unreachable: down", "retryable": True}
            return {"ok": True, "skills": [{"slug": "poi"}], "total": 1}

    reg = Reg()
    monkeypatch.setattr(native_backend, "get_registry", lambda: reg)
    out1 = json.loads(tools.claw_skill_search({"query": "p", "limit": 5}))
    assert out1["ok"] is True and not out1.get("stale")
    reg.fail = True
    out2 = json.loads(tools.claw_skill_search({"query": "p", "limit": 5}))
    assert out2["ok"] is True
    assert out2.get("stale") or out2.get("from_cache")
    assert out2["skills"][0]["slug"] == "poi"


# --- skill run history (free) --------------------------------------------
def test_skill_run_records_history(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    tools.claw_skill_run({"slug": "demo-skill", "entry": "x.py", "args": {"a": 1}})
    runs = tools.read_skill_runs(slug="demo-skill")
    assert len(runs) >= 1
    assert runs[0]["slug"] == "demo-skill"
    assert runs[0]["entry"] == "x.py"
    assert "duration_ms" in runs[0]
    assert "ok" in runs[0]


def test_runs_summary_counts():
    runs = [{"ok": True, "duration_ms": 10}, {"ok": False, "duration_ms": 30}]
    sm = tools._runs_summary(runs)
    assert sm["total"] == 2
    assert sm["ok"] == 1
    assert sm["failed"] == 1
    assert sm["success_rate"] == 0.5
    assert sm["avg_ms"] == 20


def test_claw_skill_runs_is_free(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    tools.claw_skill_run({"slug": "demo-skill", "entry": "x.py"})
    out = json.loads(tools.claw_skill_runs({"slug": "demo-skill"}))
    assert out["ok"] is True
    assert "runs" in out and "summary" in out
    assert out["summary"]["total"] >= 1


# --- credentials ----------------------------------------------------------
def test_credentials_set_read_clear(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    tools.set_credential("demo-skill", "OPENAI_API_KEY", "sk-test-123")
    assert tools.credentials_for("demo-skill").get("OPENAI_API_KEY") == "sk-test-123"
    tools.set_credential("demo-skill", "OPENAI_API_KEY", "")
    assert "OPENAI_API_KEY" not in tools.credentials_for("demo-skill")


def test_credentials_injected_into_run_env(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    tools.set_credential("demo-skill", "DEMO_TOKEN", "xyz")
    seen = {}

    class _FakeBackend:
        def skill_run(self, *, slug, entry, args, sandbox):
            seen["DEMO_TOKEN"] = os.environ.get("DEMO_TOKEN")
            return {"ok": True}

    monkeypatch.setattr(tools, "get_backend", lambda: _FakeBackend())
    tools.claw_skill_run({"slug": "demo-skill", "entry": "x.py"})
    assert seen.get("DEMO_TOKEN") == "xyz"
    assert os.environ.get("DEMO_TOKEN") is None


# --- error humanization ---------------------------------------------------
def test_humanize_known_errors():
    from omnilimb import _errors

    assert _errors.humanize(None) is None
    assert "网络" in _errors.humanize("Could not resolve host: clawhub.ai")["reason"]
    assert "API Key" in _errors.humanize("401 Unauthorized: invalid token")["reason"]
    assert "依赖" in _errors.humanize("'docker' is not recognized as a command")["reason"]
    g = _errors.humanize("some totally unexpected boom")
    assert g["reason"] and g["fix"]


# --- settings overrides layer ---------------------------------------------
def test_settings_overrides_layer(tmp_path, monkeypatch):
    import json as _json

    from omnilimb import config as _cfg

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    monkeypatch.delenv("OMNILIMB_MARKET", raising=False)
    ov = tmp_path / "omnilimb.overrides.json"
    ov.write_text(_json.dumps({"market": "skillhub", "discover_limit": 7}), encoding="utf-8")
    reload_settings()
    s = _cfg.get_settings()
    assert s.market == "skillhub"
    assert s.discover_limit == 7


# --- skill scoring (free) -------------------------------------------------
def test_score_skill_strong_vs_weak():
    from omnilimb import _scoring

    strong = _scoring.score_skill(
        {"verified": True, "downloads": 5000, "stars": 200, "has_skill_md": True,
         "description": "A well documented, vetted skill for doing useful things.",
         "version": "1.2.0", "license": "MIT", "requires_bins": []},
        installed_bins=set(),
    )
    weak = _scoring.score_skill(
        {"verified": False, "downloads": 0, "has_skill_md": False, "description": "",
         "requires_bins": ["docker"]},
        installed_bins=set(),
    )
    assert strong["score"] > weak["score"]
    assert strong["grade"] in ("A", "B")
    assert strong["recommendation"] == "recommended"
    assert weak["blockers"]
    assert weak["recommendation"] in ("caution", "not_recommended")


def test_score_skill_reliability_penalty():
    from omnilimb import _scoring

    base = {"has_skill_md": True, "description": "x" * 50, "version": "1.0.0", "requires_bins": []}
    good = _scoring.score_skill(base, runs_summary={"total": 10, "success_rate": 0.95})
    bad = _scoring.score_skill(base, runs_summary={"total": 10, "success_rate": 0.2})
    assert good["score"] > bad["score"]
    assert bad["blockers"]


def test_score_skill_tolerates_string_metadata():
    from omnilimb import _scoring

    r = _scoring.score_skill({
        "verified": True, "downloads": "12,000", "stars": "80",
        "has_skill_md": True, "description": "x" * 60, "version": "2.0.0",
        "updated_at": "2025-12-01T00:00:00Z", "license": "Apache-2.0",
        "requires_bins": [],
    })
    assert 0 <= r["score"] <= 100
    assert r["grade"] in ("A", "B", "C", "D")


# --- favorites + search history -------------------------------------------
def test_favorites_and_history(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    reload_settings()
    assert tools.read_favorites() == []
    tools.toggle_favorite("owner/skill", True, {"name": "Skill", "market": "clawhub"})
    favs = tools.read_favorites()
    assert any(f.get("slug") == "owner/skill" for f in favs)
    assert favs[0].get("name") == "Skill"
    tools.toggle_favorite("owner/skill", False)
    assert all(f.get("slug") != "owner/skill" for f in tools.read_favorites())
    tools._write_state_json("favorites.json", ["legacy"])
    assert tools.read_favorites() == [{"slug": "legacy"}]
    tools.record_search("github")
    tools.record_search("maps")
    tools.record_search("github")  # dedupe → moves to front
    hist = tools.read_search_history()
    assert hist[0] == "github"
    assert "maps" in hist
    assert hist.count("github") == 1


# --- audit log is free ----------------------------------------------------
def test_audit_writes_when_enabled(tmp_path, monkeypatch):
    import json as _json

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    (tmp_path / "omnilimb.overrides.json").write_text(_json.dumps({"audit_log": True}), encoding="utf-8")
    reload_settings()
    from omnilimb.config import get_settings

    tools._audit("claw_demo", {"x": 1}, {"ok": True})
    log = get_settings().state_dir() / "audit.jsonl"
    assert log.exists() and "claw_demo" in log.read_text(encoding="utf-8")


# --- multi-market support + mirror/skillsmp adapters ----------------------
def test_builtin_markets_and_mirror_adapter():
    from omnilimb import registries as R

    ids = {m["id"] for m in R.list_markets()}
    assert {"clawhub", "skillhub", "clawhub-cn", "skillsmp"} <= ids
    reg = R.get_registry("clawhub-cn")
    assert isinstance(reg, R.ClawHubMirrorRegistry)
    assert reg.base() == "https://mirror-cn.clawhub.com"
    assert reg.id == "clawhub-cn"
    smp = R.get_registry("skillsmp")
    assert isinstance(smp, R.SkillsmpRegistry)
    assert smp.id == "skillsmp"
    assert isinstance(R.get_registry("clawhub"), R.ClawHubRegistry)
    assert isinstance(R.get_registry("skillhub"), R.SkillHubRegistry)


def test_skillsmp_normalize_maps_github_url():
    from omnilimb.registries import SkillsmpRegistry

    n = SkillsmpRegistry()._norm({
        "id": "x", "name": "abilities", "author": "nik", "description": "d",
        "githubUrl": "https://github.com/o/r/tree/main/skills/abilities",
        "stars": 11, "updatedAt": "1780540096", "authorAvatar": "a",
    })
    assert n["slug"] == "https://github.com/o/r/tree/main/skills/abilities"
    assert n["url"] == n["slug"] and n["displayName"] == "abilities"
    assert n["stars"] == 11 and n["source"] == "skillsmp"


def test_config_defined_extra_market(tmp_path, monkeypatch):
    import json as _json

    from omnilimb import registries as R

    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    (tmp_path / "omnilimb.overrides.json").write_text(
        _json.dumps({"markets": [
            {"id": "mymirror", "type": "clawhub", "base_url": "https://my.mirror.example", "label": "My Mirror"},
        ]}), encoding="utf-8")
    reload_settings()
    ids = {m["id"] for m in R.list_markets()}
    assert "mymirror" in ids
    reg = R.get_registry("mymirror")
    assert isinstance(reg, R.ClawHubRegistry)
    assert reg.base() == "https://my.mirror.example"
    (tmp_path / "omnilimb.overrides.json").write_text(
        _json.dumps({"markets": [{"id": "bad", "type": "nope", "base_url": "x"}]}), encoding="utf-8")
    reload_settings()
    assert "bad" not in {m["id"] for m in R.list_markets()}
