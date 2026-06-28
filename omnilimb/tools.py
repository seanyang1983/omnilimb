"""Tool handlers — the code that runs when the Hermes LLM calls each tool.

Contract (per Hermes plugin docs):
  - signature: handler(args: dict, **kwargs) -> str
  - ALWAYS returns a JSON string
  - NEVER raises (catch everything, return error JSON)
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any, Callable

from . import _licensing
from ._retry import with_retry
from .backends import get_backend
from .config import get_settings, reload_settings

logger = logging.getLogger(__name__)


def _json(payload: dict[str, Any]) -> str:
    try:
        return json.dumps(payload, ensure_ascii=False, default=str)
    except Exception:
        return json.dumps({"ok": False, "error": "unserializable result"})


_AUDIT_MAX_BYTES = 1024 * 1024  # rotate audit.jsonl past ~1MB (keep newest)


def _audit(tool: str, args: dict, result: dict) -> None:
    """Append a structured audit record. Free feature — gated only by the
    ``audit_log`` toggle (no license check). Size-capped to avoid unbounded growth."""
    s = get_settings()
    if not s.audit_log:
        return
    try:
        log_path = s.state_dir() / "audit.jsonl"
        # Best-effort rotation: keep the newest ~4000 lines if the file grew large.
        try:
            if log_path.exists() and log_path.stat().st_size > _AUDIT_MAX_BYTES:
                lines = log_path.read_text(encoding="utf-8").splitlines()[-4000:]
                log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        except Exception:
            pass
        rec = {
            "ts": time.time(),
            "tool": tool,
            "backend": s.resolved_backend(),
            "args": args,
            "ok": result.get("ok"),
            "error": result.get("error"),
        }
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False, default=str) + "\n")
    except Exception as exc:  # pragma: no cover - never break the tool
        logger.debug("audit write failed: %s", exc)


def _run(tool: str, args: dict, op: Callable[[], dict], *, idempotent: bool) -> str:
    """Shared execution wrapper: retry/rollback + audit + JSON + never-raise."""
    s = get_settings()
    try:
        result = with_retry(
            op,
            retries=s.max_retries if idempotent else 0,
            backoff_s=s.retry_backoff_s,
            rollback=s.rollback,
        )
    except Exception as exc:  # backend blew up despite defenses
        result = {"ok": False, "error": f"{type(exc).__name__}: {exc}", "tool": tool}
    if not isinstance(result, dict):
        result = {"ok": True, "result": result}
    result.setdefault("ok", True)
    result.setdefault("backend", s.resolved_backend())
    _audit(tool, args, result)
    return _json(result)


# --------------------------------------------------------------------------- #
# Tool handlers
# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
# Bilingual query expansion. Most markets index skills by their English name,
# so a Chinese keyword (e.g. "浏览器") would miss English-only results. When a
# query contains CJK characters we expand it with curated domain synonyms and
# merge the result sets — lightweight, no translation API, no LLM.
# --------------------------------------------------------------------------- #
_CJK_RE = re.compile(r"[\u4e00-\u9fff]")

# Recent identical searches are served from cache for this many seconds (snappy
# repeat/pagination; marketplace data tolerates minutes of staleness).
_SEARCH_FRESH_S = 300

_QUERY_SYNONYMS: dict[str, list[str]] = {
    "浏览器": ["browser"],
    "地图": ["map"],
    "图片": ["image"],
    "图像": ["image"],
    "视觉": ["vision"],
    "数据库": ["database"],
    "数据": ["data"],
    "文件": ["file"],
    "文档": ["document"],
    "翻译": ["translate"],
    "搜索": ["search"],
    "天气": ["weather"],
    "邮件": ["email"],
    "邮箱": ["email"],
    "语音": ["voice"],
    "音频": ["audio"],
    "视频": ["video"],
    "爬虫": ["crawler", "scraper"],
    "抓取": ["scrape"],
    "终端": ["terminal"],
    "命令行": ["cli"],
    "代码": ["code"],
    "音乐": ["music"],
    "聊天": ["chat"],
    "支付": ["payment"],
    "日历": ["calendar"],
    "笔记": ["note"],
    "表格": ["spreadsheet"],
    "excel": ["excel", "spreadsheet"],
    "演示": ["presentation"],
    "幻灯片": ["slides"],
    "图表": ["chart"],
    "地理": ["geo"],
    "安全": ["security"],
    "加密": ["crypto", "encryption"],
    "区块链": ["blockchain"],
    "图像识别": ["ocr"],
    "识别": ["recognition"],
    "机器人": ["bot"],
    "自动化": ["automation"],
    "测试": ["test"],
    "部署": ["deploy"],
    "监控": ["monitor"],
    "日志": ["log"],
    "知识库": ["knowledge"],
    "助手": ["assistant"],
    "幻灯": ["slides"],
    "网页": ["web", "webpage"],
    "网站": ["website"],
    "接口": ["api"],
    "下载": ["download", "downloader"],
    "上传": ["upload"],
    "压缩": ["compress", "zip"],
    "解压": ["unzip", "extract"],
    "转换": ["convert", "converter"],
    "格式化": ["format", "formatter"],
    "提醒": ["reminder"],
    "待办": ["todo"],
    "任务": ["task"],
    "工作流": ["workflow"],
    "调度": ["scheduler", "cron"],
    "通知": ["notification", "notify"],
    "短信": ["sms"],
    "电话": ["phone", "call"],
    "微信": ["wechat"],
    "钉钉": ["dingtalk"],
    "飞书": ["feishu", "lark"],
    "数据分析": ["analytics", "analysis"],
    "可视化": ["visualization", "chart"],
    "报表": ["report"],
    "爬取": ["crawl", "scrape"],
    "网络": ["network"],
    "代理": ["proxy"],
    "下单": ["order"],
    "电商": ["ecommerce", "shop"],
    "股票": ["stock"],
    "金融": ["finance"],
    "汇率": ["currency", "exchange"],
    "新闻": ["news"],
    "摘要": ["summary", "summarize"],
    "总结": ["summarize"],
    "问答": ["qa"],
    "对话": ["chat", "conversation"],
    "情感": ["sentiment"],
    "分类": ["classify", "classification"],
    "标注": ["annotation", "label"],
    "训练": ["train", "training"],
    "模型": ["model"],
    "嵌入": ["embedding"],
    "向量": ["vector"],
    "检索": ["retrieval", "search"],
    "推荐": ["recommend", "recommendation"],
    "翻译器": ["translator"],
    "语言": ["language"],
    "拼写": ["spell", "spelling"],
    "语法": ["grammar"],
    "正则": ["regex"],
    "加解密": ["crypto"],
    "哈希": ["hash"],
    "密码": ["password"],
    "认证": ["auth", "authentication"],
    "登录": ["login"],
    "令牌": ["token"],
    "证书": ["certificate"],
    "防火墙": ["firewall"],
    "扫描": ["scan", "scanner"],
    "漏洞": ["vulnerability"],
    "渗透": ["pentest"],
    "容器": ["container", "docker"],
    "镜像": ["image", "docker"],
    "集群": ["cluster", "kubernetes"],
    "云": ["cloud"],
    "服务器": ["server"],
    "运维": ["devops", "ops"],
    "备份": ["backup"],
    "迁移": ["migration", "migrate"],
    "缓存": ["cache"],
    "队列": ["queue"],
    "消息": ["message", "messaging"],
    "事件": ["event"],
    "钩子": ["webhook", "hook"],
    "定时": ["scheduler", "cron"],
    "文本": ["text"],
    "字幕": ["subtitle"],
    "朗读": ["tts", "speech"],
    "识图": ["ocr"],
    "二维码": ["qrcode"],
    "条码": ["barcode"],
    "地址": ["address"],
    "导航": ["navigation", "map"],
    "定位": ["location", "geo"],
    "绘图": ["draw", "chart"],
    "画图": ["draw", "diagram"],
    "流程图": ["flowchart", "diagram"],
    "思维导图": ["mindmap"],
    "游戏": ["game"],
    "爬山": ["climb"],
    "健康": ["health"],
    "翻页": ["pagination"],
    "表单": ["form"],
    "评论": ["comment"],
    "博客": ["blog"],
    "社交": ["social"],
    "邮政": ["postal"],
    "快递": ["express", "shipping"],
    "物流": ["logistics"],
    "订阅": ["subscribe", "subscription"],
}


def _build_reverse_synonyms() -> dict:
    """Invert the CN→EN map so English queries can pull in Chinese-described skills."""
    rev: dict = {}
    for cn, ens in _QUERY_SYNONYMS.items():
        for en in ens:
            rev.setdefault(en.lower(), [])
            if cn not in rev[en.lower()]:
                rev[en.lower()].append(cn)
    return rev


_REVERSE_SYNONYMS = _build_reverse_synonyms()


def _expand_queries(query: str, *, cap: int = 3) -> list[str]:
    """Bidirectional expansion: a CN query also searches its English domain terms,
    and an English query also searches its Chinese equivalents. Lightweight, no API."""
    terms = [query]
    if not query:
        return terms
    if _CJK_RE.search(query):
        for cn, ens in _QUERY_SYNONYMS.items():
            if cn in query:
                for en in ens:
                    if en not in terms:
                        terms.append(en)
    else:
        words = set(re.findall(r"[a-z0-9]+", query.lower()))
        full = query.lower().strip()
        for en, cns in _REVERSE_SYNONYMS.items():
            if en == full or en in words:
                for cn in cns:
                    if cn not in terms:
                        terms.append(cn)
    return terms[:cap]


def _to_num(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _merged_search(backend, terms: list[str], *, limit: int, page: int,
                   category: str | None, sort: str | None) -> dict:
    """Run each query term IN PARALLEL, merge + de-dupe by slug, paginate.

    Parallel fan-out keeps a 2–3 term expansion roughly as fast as a single
    market call instead of stacking round-trips.
    """
    from concurrent.futures import ThreadPoolExecutor

    pool = max(limit * (page + 1), limit)  # peek one page ahead for accurate paging

    def fetch(term):
        try:
            return backend.skill_search(query=term, limit=pool, page=1,
                                        category=category, sort=sort)
        except Exception as exc:  # pragma: no cover - defensive
            return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}

    with ThreadPoolExecutor(max_workers=min(len(terms), 4)) as ex:
        results = list(ex.map(fetch, terms))  # ex.map preserves term order

    seen: set = set()
    merged: list = []
    ok_any = False
    last_err = None
    for r in results:
        if not isinstance(r, dict) or not r.get("ok"):
            last_err = (r.get("error") if isinstance(r, dict) else None) or last_err
            continue
        ok_any = True
        for sk in (r.get("skills") or []):
            slug = sk.get("slug") or sk.get("name")
            if not slug or slug in seen:
                continue
            seen.add(slug)
            merged.append(sk)
    if not ok_any:
        return {"ok": False, "error": last_err or "search failed"}
    if sort in ("downloads", "stars"):
        merged.sort(key=lambda s: _to_num(s.get(sort)), reverse=True)
    start = (page - 1) * limit
    window = merged[start:start + limit]
    return {
        "ok": True,
        "skills": window,
        "total": len(merged),
        "page": page,
        "query": terms[0],
        "expanded": terms[1:],
    }


def claw_skill_search(args: dict, **kwargs) -> str:
    del kwargs
    query = str(args.get("query", "")).strip()
    category = str(args.get("category", "")).strip() or None
    browse = bool(args.get("browse", False))
    # Require at least one of: query, category, or explicit browse (keeps the
    # empty-args call cheap/offline for tests and the LLM contract).
    if not query and not category and not browse:
        return _json({"ok": False, "error": "query is required"})
    limit = int(args.get("limit", 12) or 12)
    page = int(args.get("page", 1) or 1)
    sort = str(args.get("sort", "")).strip() or None
    backend = get_backend()
    terms = _expand_queries(query) if query else [query]

    # Freshness fast-path: a recent identical search (incl. expansion/page/sort)
    # is served straight from cache so repeat + paginated browsing feels instant.
    from . import _cache
    s = get_settings()
    ckey = _cache.make_key("exsearch", s.market, "||".join(terms),
                           sort or "", category or "", bool(browse), page, limit)
    if query and s.cache_enabled:
        fresh = _cache.cache_fresh(ckey, _SEARCH_FRESH_S)
        if fresh is not None:
            return _json(fresh)

    if len(terms) > 1:
        out = _run(
            "claw_skill_search",
            args,
            lambda: _merged_search(backend, terms, limit=limit, page=page,
                                   category=category, sort=sort),
            idempotent=True,
        )
    else:
        out = _run(
            "claw_skill_search",
            args,
            lambda: backend.skill_search(
                query=query, limit=limit, page=page, category=category, sort=sort
            ),
            idempotent=True,
        )
    if query and s.cache_enabled:
        try:
            d = json.loads(out)
            if isinstance(d, dict) and d.get("ok"):
                _cache.cache_put(ckey, d)
        except Exception:
            pass
    return out


def claw_skill_install(args: dict, **kwargs) -> str:
    del kwargs
    slug = str(args.get("slug", "")).strip()
    if not slug:
        return _json({"ok": False, "error": "slug is required"})
    verify = bool(args.get("verify", True))
    global_install = bool(args.get("global_install", False))
    git_fallback = bool(args.get("git_fallback", False))
    backend = get_backend()
    return _run(
        "claw_skill_install",
        args,
        lambda: backend.skill_install(
            slug=slug, verify=verify, global_install=global_install, git_fallback=git_fallback
        ),
        idempotent=True,
    )


def claw_skill_list(args: dict, **kwargs) -> str:
    """List skills installed in the workspace (filesystem scan, never raises)."""
    del args, kwargs
    try:
        from .backends.native_backend import NativeBackend

        return _json(NativeBackend().list_installed())
    except Exception as exc:  # pragma: no cover - defensive
        return _json({"ok": False, "error": f"{type(exc).__name__}: {exc}"})


def _bump_usage(slug: str) -> None:
    """Record a skill invocation (count + last timestamp). Best-effort, never raises."""
    if not slug:
        return
    try:
        s = get_settings()
        path = s.state_dir() / "usage.json"
        data: dict[str, Any] = {}
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8")) or {}
            except Exception:
                data = {}
        rec = data.get(slug) or {}
        rec["count"] = int(rec.get("count", 0)) + 1
        rec["last_ts"] = time.time()
        data[slug] = rec
        path.write_text(json.dumps(data), encoding="utf-8")
    except Exception as exc:  # pragma: no cover - never break the tool
        logger.debug("usage bump failed: %s", exc)


def read_usage() -> dict[str, Any]:
    """Return the usage map {slug: {count, last_ts}}. Never raises."""
    try:
        path = get_settings().state_dir() / "usage.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8")) or {}
    except Exception:
        pass
    return {}


# --------------------------------------------------------------------------- #
# Pro-1: per-skill run history (skill_runs.jsonl). Recording is always-on and
# cheap (like usage.json); VIEWING it (tool/endpoint/UI) is Pro-gated.
# --------------------------------------------------------------------------- #
_SKILL_RUNS_MAX_BYTES = 512 * 1024


def _summarize(value: Any, limit: int = 200) -> Any:
    """Compact a value for storage (truncate long strings/containers)."""
    try:
        if isinstance(value, str):
            return value if len(value) <= limit else value[:limit] + "…"
        if isinstance(value, dict):
            return {k: _summarize(v, 80) for k, v in list(value.items())[:20]}
        if isinstance(value, (list, tuple)):
            return [_summarize(v, 80) for v in list(value)[:20]]
        return value
    except Exception:
        return None


def _record_run(slug: str, entry: str, args: dict, result: dict, duration_ms: int) -> None:
    """Append one skill-run record. Best-effort, never raises."""
    if not slug:
        return
    try:
        s = get_settings()
        path = s.state_dir() / "skill_runs.jsonl"
        # Best-effort size cap: keep the newest ~1000 lines if the file grew large.
        try:
            if path.exists() and path.stat().st_size > _SKILL_RUNS_MAX_BYTES:
                lines = path.read_text(encoding="utf-8").splitlines()[-1000:]
                path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        except Exception:
            pass
        rec = {
            "ts": time.time(),
            "slug": slug,
            "entry": entry,
            "args": _summarize(args if isinstance(args, dict) else {}),
            "ok": bool(result.get("ok")),
            "duration_ms": int(duration_ms),
            "error": _summarize(result.get("error")) if result.get("error") else None,
            "backend": s.resolved_backend(),
        }
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False, default=str) + "\n")
    except Exception as exc:  # pragma: no cover - never break the tool
        logger.debug("run record failed: %s", exc)


def read_skill_runs(slug: str | None = None, limit: int = 100, only_failed: bool = False) -> list[dict]:
    """Return newest-first run records, optionally filtered by slug/only_failed."""
    out: list[dict] = []
    try:
        path = get_settings().state_dir() / "skill_runs.jsonl"
        if not path.exists():
            return out
        lines = path.read_text(encoding="utf-8").splitlines()
        cap = max(1, min(int(limit), 1000))
        for line in reversed(lines):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            if slug and rec.get("slug") != slug:
                continue
            if only_failed and rec.get("ok"):
                continue
            out.append(rec)
            if len(out) >= cap:
                break
    except Exception:
        pass
    return out


def _runs_summary(runs: list[dict]) -> dict:
    """Aggregate stats over a list of run records."""
    n = len(runs)
    ok = sum(1 for r in runs if r.get("ok"))
    durs = [r.get("duration_ms") for r in runs if isinstance(r.get("duration_ms"), (int, float))]
    return {
        "total": n,
        "ok": ok,
        "failed": n - ok,
        "success_rate": round(ok / n, 3) if n else None,
        "avg_ms": int(sum(durs) / len(durs)) if durs else None,
        "last_ts": runs[0].get("ts") if runs else None,
    }


# --------------------------------------------------------------------------- #
# Feature A: per-skill credentials (API keys). Stored locally with 600 perms,
# never committed, never echoed back. Injected into the environment around a
# skill run so the skill's subprocess can read them.
# --------------------------------------------------------------------------- #
def _credentials_path():
    return get_settings().state_dir() / "credentials.json"


def read_credentials() -> dict:
    """Return {slug: {KEY: value}}. Never raises."""
    try:
        p = _credentials_path()
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8")) or {}
    except Exception:
        pass
    return {}


def _write_credentials(data: dict) -> None:
    p = _credentials_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data), encoding="utf-8")
    try:
        os.chmod(p, 0o600)
    except Exception:  # pragma: no cover - best effort (e.g. Windows ACLs)
        pass


def set_credential(slug: str, key: str, value: Any) -> None:
    """Set or (when value is empty/None) clear one credential for a skill."""
    if not slug or not key:
        return
    data = read_credentials()
    rec = dict(data.get(slug) or {})
    if value in (None, ""):
        rec.pop(key, None)
    else:
        rec[key] = str(value)
    if rec:
        data[slug] = rec
    else:
        data.pop(slug, None)
    _write_credentials(data)


def credentials_for(slug: str) -> dict:
    """Return the stored {KEY: value} for one skill."""
    return dict(read_credentials().get(slug) or {})


# --------------------------------------------------------------------------- #
# Feature K: favorites + search history (local JSON in state_dir).
# --------------------------------------------------------------------------- #
def _state_json(name: str) -> Any:
    try:
        p = get_settings().state_dir() / name
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        pass
    return None


def _write_state_json(name: str, data: Any) -> None:
    try:
        p = get_settings().state_dir() / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    except Exception as exc:  # pragma: no cover
        logger.debug("state write failed (%s): %s", name, exc)


def read_favorites() -> list:
    """Favorites as a list of dicts {slug, name?, summary?, market?, url?, icon?}.
    Old format (list of slug strings) is normalised on read for back-compat."""
    data = _state_json("favorites.json")
    if not isinstance(data, list):
        return []
    out: list = []
    for f in data:
        if isinstance(f, dict) and f.get("slug"):
            out.append(f)
        elif isinstance(f, str) and f.strip():
            out.append({"slug": f.strip()})
    return out


def toggle_favorite(slug: str, add: bool, meta: dict | None = None) -> list:
    slug = (slug or "").strip()
    favs = [f for f in read_favorites() if f.get("slug") != slug]
    if add and slug:
        entry = {"slug": slug}
        if isinstance(meta, dict):
            for k in ("name", "summary", "market", "url", "icon"):
                v = meta.get(k)
                if v:
                    entry[k] = v
        favs.append(entry)
    _write_state_json("favorites.json", favs)
    return favs


def read_search_history() -> list:
    data = _state_json("search_history.json")
    return data if isinstance(data, list) else []


def record_search(q: str) -> None:
    q = (q or "").strip()
    if not q:
        return
    hist = [h for h in read_search_history() if h != q]
    hist.insert(0, q)
    _write_state_json("search_history.json", hist[:30])


def claw_skill_run(args: dict, **kwargs) -> str:
    del kwargs
    slug = str(args.get("slug", "")).strip()
    entry = str(args.get("entry", "")).strip()
    if not slug or not entry:
        return _json({"ok": False, "error": "slug and entry are required"})
    run_args = args.get("args") or {}
    sandbox = bool(args.get("sandbox", True))
    _bump_usage(slug)
    backend = get_backend()
    # Feature A: inject this skill's stored credentials into the env for the run,
    # then restore — so the skill's subprocess can read its API keys.
    creds = credentials_for(slug)
    saved_env: dict[str, str | None] = {}
    for k, v in creds.items():
        saved_env[k] = os.environ.get(k)
        os.environ[k] = v
    t0 = time.time()
    try:
        out = _run(
            "claw_skill_run",
            args,
            lambda: backend.skill_run(slug=slug, entry=entry, args=run_args, sandbox=sandbox),
            idempotent=False,
        )
    finally:
        for k, old in saved_env.items():
            if old is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = old
    duration_ms = int((time.time() - t0) * 1000)
    try:  # record run history (Pro-1) — best-effort, never breaks the tool
        _record_run(slug, entry, run_args, json.loads(out), duration_ms)
    except Exception:
        pass
    return out


def claw_skill_runs(args: dict, **kwargs) -> str:
    """Pro: read a skill's run history (for agent diagnostics)."""
    del kwargs
    gate = _licensing.require_pro("claw_skill_runs")
    if gate is not None:
        return _json(gate)
    slug = str(args.get("slug", "")).strip() or None
    limit = int(args.get("limit", 50) or 50)
    only_failed = bool(args.get("only_failed", False))
    runs = read_skill_runs(slug=slug, limit=limit, only_failed=only_failed)
    return _json({
        "ok": True,
        "slug": slug,
        "count": len(runs),
        "runs": runs,
        "summary": _runs_summary(runs),
    })


def claw_sandbox_exec(args: dict, **kwargs) -> str:
    del kwargs
    command = str(args.get("command", "")).strip()
    if not command:
        return _json({"ok": False, "error": "command is required"})
    s = get_settings()
    image = str(args.get("image") or s.sandbox_image)
    timeout_s = int(args.get("timeout_s") or s.default_timeout_s)
    network = bool(args.get("network", s.sandbox_network))
    workdir = args.get("workdir")
    backend = get_backend()
    return _run(
        "claw_sandbox_exec",
        args,
        lambda: backend.sandbox_exec(
            command=command,
            image=image,
            timeout_s=timeout_s,
            network=network,
            workdir=workdir,
        ),
        idempotent=False,
    )


def claw_browser(args: dict, **kwargs) -> str:
    del kwargs
    actions = args.get("actions")
    if not isinstance(actions, list) or not actions:
        return _json({"ok": False, "error": "actions must be a non-empty array"})
    s = get_settings()
    headless = bool(args.get("headless", s.browser_headless))
    backend = get_backend()
    return _run(
        "claw_browser",
        args,
        lambda: backend.browser(actions=actions, headless=headless),
        idempotent=False,
    )


def _load_packs() -> dict:
    from pathlib import Path

    try:
        import yaml  # type: ignore

        path = Path(__file__).parent / "packs.yaml"
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        return data.get("packs") or {}
    except Exception as exc:  # pragma: no cover - defensive
        logger.debug("packs load failed: %s", exc)
        return {}


def claw_pack_list(args: dict, **kwargs) -> str:
    del args, kwargs
    packs = _load_packs()
    return _json({
        "ok": True,
        "pro_required_to_install": not get_settings().is_pro(),
        "packs": {
            name: {"description": p.get("description"), "skills": p.get("skills", [])}
            for name, p in packs.items()
        },
    })


def claw_pack_install(args: dict, **kwargs) -> str:
    del kwargs
    gate = _licensing.require_pro("claw_pack_install")
    if gate is not None:
        return _json(gate)
    name = str(args.get("pack", "")).strip()
    packs = _load_packs()
    if name not in packs:
        return _json({"ok": False, "error": f"unknown pack '{name}'", "available": list(packs)})
    global_install = bool(args.get("global_install", False))
    backend = get_backend()
    s = get_settings()
    from .backends.native_backend import NativeBackend

    skill_dir = NativeBackend()._skill_dir
    slugs = packs[name].get("skills", [])
    results: list[dict] = []
    newly: list = []  # skill dirs created by THIS operation (for rollback)
    for slug in slugs:
        existed = skill_dir(slug).exists()
        try:
            r = with_retry(
                lambda slug=slug: backend.skill_install(
                    slug=slug, verify=True, global_install=global_install
                ),
                retries=s.max_retries,
                backoff_s=s.retry_backoff_s,
                rollback=s.rollback,
            )
        except Exception as exc:
            r = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
        ok = bool(r.get("ok"))
        if ok and not existed:
            newly.append(skill_dir(slug))
        results.append({"slug": slug, "ok": ok, "error": r.get("error"), "version": r.get("version")})

    all_ok = all(x["ok"] for x in results) if results else False
    rolled_back = False
    # Transactional: on any failure, roll back the installs THIS op created.
    if not all_ok and s.rollback and newly:
        import shutil

        for d in newly:
            try:
                if d.exists():
                    shutil.rmtree(d, ignore_errors=True)
            except Exception:  # pragma: no cover - best effort
                pass
        rolled_back = True
    out: dict[str, Any] = {
        "ok": all_ok,
        "pack": name,
        "transactional": True,
        "installed": [x["slug"] for x in results if x["ok"]] if all_ok else [],
        "results": results,
        "rolled_back": rolled_back,
        "backend": s.resolved_backend(),
    }
    if not all_ok:
        failed = [x["slug"] for x in results if not x["ok"]]
        out["error"] = (
            f"pack '{name}' install failed for {failed}"
            + (f"; rolled back {len(newly)} partial install(s)" if rolled_back else "")
        )
    _audit("claw_pack_install", args, out)
    return _json(out)


def claw_skill_update(args: dict, **kwargs) -> str:
    del kwargs
    gate = _licensing.require_pro("claw_skill_update")
    if gate is not None:
        return _json(gate)
    slug = str(args.get("slug", "")).strip() or None
    all_ = bool(args.get("all", False))
    if not slug and not all_:
        return _json({"ok": False, "error": "pass slug or all=true"})
    backend = get_backend()
    return _run(
        "claw_skill_update",
        args,
        lambda: backend.skill_update(slug=slug, all_=all_),
        idempotent=True,
    )


def claw_skill_to_hermes(args: dict, **kwargs) -> str:
    """Convert installed marketplace skills into native Hermes skills, then
    run→test→fix→retest each conversion until it loads or fails clearly.
    Free in 1.0."""
    del kwargs
    # Free in 1.0: require_pro() is a no-op while all features are unlocked
    # (it only gates when OMNILIMB_ENFORCE_LICENSE=1). Kept for reversibility.
    gate = _licensing.require_pro("claw_skill_to_hermes")
    if gate is not None:
        return _json(gate)  # gate runs before any discovery/IO
    slugs = args.get("slugs")
    if isinstance(args.get("slug"), str) and args.get("slug").strip():
        slugs = [args["slug"].strip()]  # accept singular or plural
    output_dir = (
        (str(args.get("output_dir")).strip() or None) if args.get("output_dir") else None
    )
    overwrite = bool(args.get("overwrite", False))
    max_iterations = args.get("max_iterations")
    # Conversion mode (Req 9.1/9.2, 12.1/12.2): normalize and coerce any
    # unrecognized value to the deterministic (free) default.
    mode = str(args.get("mode") or "deterministic").strip().lower()
    if mode not in {"deterministic", "ai_curated"}:
        mode = "deterministic"
    from . import _converter

    return _run(
        "claw_skill_to_hermes",
        args,
        lambda: _converter.run_conversion(
            slugs=slugs,
            output_dir=output_dir,
            overwrite=overwrite,
            max_iterations=max_iterations,
            mode=mode,
        ),
        idempotent=False,  # conversion has side effects; loop has its own bounded retry
    )


def claw_runtime(args: dict, **kwargs) -> str:
    del kwargs
    lang = str(args.get("lang", "")).strip().lower()
    code = args.get("code", "")
    if not lang or not code:
        return _json({"ok": False, "error": "lang and code are required"})
    timeout_s = int(args.get("timeout_s", 60) or 60)
    backend = get_backend()
    return _run(
        "claw_runtime",
        args,
        lambda: backend.runtime(lang=lang, code=code, timeout_s=timeout_s),
        idempotent=True,
    )


def claw_skill_learn(args: dict, **kwargs) -> str:
    """Learn a native Hermes skill from any source (path / URL / text).

    Open-ended `/learn` equivalent built on the converter substrate: gather the
    source, author a SKILL.md to Hermes authoring standards, validate, and write
    it transactionally. Free in Omnilimb 1.0.
    """
    del kwargs
    source = args.get("source")
    if not isinstance(source, str) or not source.strip():
        return _json({"ok": False, "error": "source is required (a path, URL, or text)"})
    source_type = str(args.get("source_type") or "auto").strip().lower()
    if source_type not in {"auto", "path", "url", "text"}:
        source_type = "auto"
    mode = str(args.get("mode") or "ai_curated").strip().lower()
    if mode not in {"ai_curated", "deterministic"}:
        mode = "ai_curated"
    name = (str(args.get("name")).strip() or None) if args.get("name") else None
    overwrite = bool(args.get("overwrite", True))
    output_dir = (str(args.get("output_dir")).strip() or None) if args.get("output_dir") else None
    from . import _learn

    return _run(
        "claw_skill_learn",
        args,
        lambda: _learn.run_learn(
            source=source.strip(),
            source_type=source_type,
            mode=mode,
            name=name,
            overwrite=overwrite,
            output_dir=output_dir,
        ),
        idempotent=False,
    )


# --------------------------------------------------------------------------- #
# Slash command: /exo [status|backend|doctor]
# --------------------------------------------------------------------------- #
def slash_claw(raw_args: str) -> str:
    sub = (raw_args or "status").strip().lower() or "status"
    s = reload_settings()
    if sub in ("packs",):
        packs = _load_packs()
        if not packs:
            return "No curated packs defined."
        tier = "Pro" if s.is_pro() else "Free (install needs Pro)"
        lines = [f"Curated packs ({tier}):"]
        for name, p in packs.items():
            lines.append(f"  {name}: {p.get('description', '')} [{len(p.get('skills', []))} skills]")
        return "\n".join(lines)
    if sub in ("backend",):
        return f"Omnilimb backend: configured={s.backend} resolved={s.resolved_backend()}"
    if sub in ("doctor",):
        from .backends.cli_backend import openclaw_binary

        cli = openclaw_binary()
        lic = _licensing.describe(s.license_key)
        lines = [
            "Omnilimb doctor:",
            f"  configured backend : {s.backend}",
            f"  resolved backend   : {s.resolved_backend()}",
            f"  market             : {s.market}",
            f"  openclaw CLI       : {cli or 'not found on PATH'}",
            f"  sandbox image      : {s.sandbox_image} (enabled={s.sandbox_enabled})",
            f"  workspace          : {s.workspace_dir()}",
            f"  license            : {lic}",
        ]
        return "\n".join(lines)
    # status
    return (
        f"Omnilimb v1.0.0 | backend={s.resolved_backend()} | market={s.market} | "
        f"edition=open (all features free) | tools=11"
    )
