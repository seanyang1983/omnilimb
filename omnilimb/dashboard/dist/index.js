/* Omnilimb 1.0 — full dashboard panel, hand-written for the v0.17.0 Plugin SDK.
 *
 * Uses window.__HERMES_PLUGIN_SDK__ (host React + shadcn components + fetchJSON +
 * useI18n); never bundles its own React. Registers via __HERMES_PLUGINS__.register.
 * Bilingual (EN / 简体中文) via SDK.useI18n().locale.
 * Tabs: Search(+Discover) / Installed(+detail) / Converted /
 *       Favorites / Audit / Steward / Settings(+overview).
 * Installed detail: 体检(score) / 就绪检查 / 凭据 / SKILL.md view-edit / 冒烟测试,
 *       update badges, and Export/Import. Steward = embedded Hermes terminal on
 *       top + sub-tabs [butler / Learn form]. The butler is a single-result panel
 *       (click an action → replaces the result, no growing transcript).
 *       Overview is a compact strip at the bottom of Settings. 0.80 parity.
 */
(function () {
  "use strict";
  var SDK = window.__HERMES_PLUGIN_SDK__;
  var REG = window.__HERMES_PLUGINS__;
  if (!SDK || !REG || !SDK.React) return;

  var React = SDK.React;
  var e = React.createElement;
  var H = SDK.hooks || React;
  var useState = H.useState || React.useState;
  var useEffect = H.useEffect || React.useEffect;
  var useCallback = H.useCallback || React.useCallback;
  var useRef = H.useRef || React.useRef;
  var C = SDK.components || {};
  var Card = C.Card || "div", CardContent = C.CardContent || "div",
      Badge = C.Badge || "span", Button = C.Button || "button",
      Separator = C.Separator || "hr";
  var cn = (SDK.utils && SDK.utils.cn) || function () {
    return Array.prototype.filter.call(arguments, Boolean).join(" ");
  };

  // ---- i18n: pick our own strings by the host's active locale ----
  var STR = {
    en: {
      tabs: { overview: "Overview", search: "Search", installed: "Installed",
              converted: "Converted", learn: "Learn", audit: "Audit", settings: "Settings" },
      loading: "loading", version: "Version", edition: "Edition", editionFree: "Open (all free)",
      backend: "Backend", market: "Market", markets: "Markets", runs: "Runs",
      license: "License", workspace: "Workspace",
      searchPh: "Search skills (empty = browse popular)", defaultOpt: "(default)",
      sortDownloads: "downloads", sortStars: "stars", sortNewest: "newest", sortRelevance: "relevance",
      searchBtn: "Search", searching: "Searching...", searchingMsg: "searching", noResults: "No results.",
      verified: "verified", install: "Install", installing: "Installing...", installed: "Installed", retry: "Retry",
      loadInstalled: "loading installed", noInstalled: "No skills installed yet. Use Search to install some.",
      calls: "calls", last: "last", toHermes: "\u2192 Hermes", converting: "Converting...",
      convertedW: "Converted", retryConvert: "Retry convert", uninstall: "Uninstall",
      confirmUninstall: "Uninstall this skill?",
      loadConverted: "loading converted", noConverted: "No converted skills yet. Convert one from Installed, or use Learn.",
      remove: "Remove", confirmRemove: "Remove this converted skill?",
      learnDesc: "Distill a native Hermes skill from any source — a local path, a URL, or pasted text. The open-ended /learn equivalent.",
      autoDetect: "auto-detect", typePath: "path", typeUrl: "url", typeText: "text",
      modeAi: "ai_curated (model)", modeDet: "deterministic (offline)",
      namePh: "skill name (optional)", srcPh: "Path / URL, or paste the material to learn from...",
      learnBtn: "Learn skill", learning: "Learning...", learnFail: "learn failed",
      fellBack: "(model unavailable — used deterministic draft)",
      loadAudit: "loading audit", auditOn: "Audit recording: on", auditOff: "Audit recording: off (enable in Settings)",
      allTools: "all tools", noAudit: "No audit records.", ok: "ok", fail: "fail",
      loadSettings: "loading settings", sandboxEnabled: "Sandbox enabled", sandboxImage: "Sandbox image",
      auditLogRec: "Audit log recording", cacheEnabled: "Cache enabled", saveSettings: "Save settings",
      saved: "Saved.", saveFailed: "Save failed.", statusErr: "status error",
      tabSteward: "Steward", tabFavorites: "Favorites",
      discoverTtl: "Discover cache TTL (s)", discoverLimit: "Discover results",
      cacheMaxAge: "Cache max age (s)", browserHeadless: "Headless browser",
      sandboxNetwork: "Sandbox network", restartNote: "Some changes take effect after restart.",
      stewardDesc: "A deterministic skill steward (no LLM). Ask it to health-check, recommend, diagnose, or scan the audit log — or type a command.",
      qHealth: "Health-check", qRecommend: "Recommend", qDiagnose: "Diagnose", qAudit: "Scan audit", qAbout: "About", qHelp: "Help",
      promptPh: "Type a command or question (e.g. recommend github)...", send: "Send", thinking: "Thinking...",
      stewardBoxTitle: "Skill butler", connectHermes: "Connect Hermes",
      connectHint: "A live Hermes agent terminal, right here. Click Connect to start a real session over the dashboard PTY.",
      agentComposerPh: "Prompt for the Hermes agent...", openChat: "Open full chat \u2197",
      termConnect: "Connect", termDisconnect: "Disconnect", termConnecting: "connecting",
      termOpen: "connected", termClosed: "disconnected", termErr: "error",
      termUnavail: "Terminal failed to load — try refreshing the page.", overviewTitle: "Overview",
      workspaceHint: "Leave empty to use the default (~/.openclaw/workspace).",
      loadFav: "loading favorites", noFav: "No favorites yet. Click the heart on any skill to bookmark it here.", removeFav: "Remove",
      detail: "Details", checkScore: "Health check", scoring: "checking", grade: "Grade",
      dimensions: "Dimensions", blockers: "Blockers", capabilities: "Capabilities", reliability: "Real-world reliability",
      recRecommended: "recommended", recCaution: "caution", recNotRec: "not recommended",
      readiness: "Readiness", checkReady: "Check readiness", ready: "Ready", notReady: "Not ready",
      reqBin: "command", reqKey: "API key", present: "present", missing: "missing",
      credentials: "Credentials", credDeclared: "Declared keys", credSet: "Set", credNone: "No declared keys.",
      credKeyPh: "key name (e.g. OPENAI_API_KEY)", credValPh: "value (blank = clear)", credSave: "Set", credSaved: "Saved",
      skillMd: "SKILL.md", filesLbl: "Files", saveFile: "Save", fileSaved: "Saved", fileLoad: "loading file",
      smoketest: "Smoke test", smoketesting: "testing", entryPh: "entry (optional, auto-detect)", runSmoke: "Run smoke test",
      smokeOk: "Smoke test passed", smokeFail: "Smoke test failed", smokeDoc: "Doc-only skill (no runnable script).",
      updateAvail: "update", current: "current", latest: "latest",
      exportImport: "Export / Import", exportBtn: "Export", importBtn: "Import", importing: "importing",
      importPh: "Paste a skill manifest JSON here...", copyJson: "Copy", copied: "Copied", importDone: "Import done",
      modeSearch: "Search", modeDiscover: "Discover", category: "Category", allCategories: "all categories",
      discRecommended: "Recommended", discRising: "Rising", discHot: "Hot", discNewest: "Newest", loadingBoard: "loading board",
    },
    zh: {
      tabs: { overview: "概览", search: "搜索", installed: "已安装",
              converted: "已转换", learn: "学习", audit: "审计", settings: "设置" },
      loading: "加载中", version: "版本", edition: "版本类型", editionFree: "开放版（全免费）",
      backend: "后端", market: "市场", markets: "市场数", runs: "运行次数",
      license: "许可", workspace: "工作区",
      searchPh: "搜索技能（留空=浏览热门）", defaultOpt: "（默认）",
      sortDownloads: "下载量", sortStars: "星标", sortNewest: "最新", sortRelevance: "相关度",
      searchBtn: "搜索", searching: "搜索中...", searchingMsg: "搜索中", noResults: "无结果。",
      verified: "已验证", install: "安装", installing: "安装中...", installed: "已安装", retry: "重试",
      loadInstalled: "加载已安装", noInstalled: "还没安装技能。去「搜索」装几个。",
      calls: "调用", last: "最近", toHermes: "\u2192 Hermes", converting: "转换中...",
      convertedW: "已转换", retryConvert: "重试转换", uninstall: "卸载",
      confirmUninstall: "卸载这个技能？",
      loadConverted: "加载已转换", noConverted: "还没有已转换技能。从「已安装」转换一个，或用「学习」。",
      remove: "移除", confirmRemove: "移除这个已转换技能？",
      learnDesc: "从任意来源蒸馏出一个原生 Hermes 技能 —— 本地路径、URL 或粘贴文本。开放进料版的 /learn。",
      autoDetect: "自动识别", typePath: "路径", typeUrl: "网址", typeText: "文本",
      modeAi: "ai_curated（用模型）", modeDet: "deterministic（离线）",
      namePh: "技能名（可选）", srcPh: "路径 / 网址，或粘贴要学习的材料...",
      learnBtn: "学习技能", learning: "学习中...", learnFail: "学习失败",
      fellBack: "（模型不可用 —— 已用离线草稿）",
      loadAudit: "加载审计", auditOn: "审计记录：开", auditOff: "审计记录：关（在「设置」里开启）",
      allTools: "全部工具", noAudit: "无审计记录。", ok: "成功", fail: "失败",
      loadSettings: "加载设置", sandboxEnabled: "启用沙箱", sandboxImage: "沙箱镜像",
      auditLogRec: "审计日志记录", cacheEnabled: "启用缓存", saveSettings: "保存设置",
      saved: "已保存。", saveFailed: "保存失败。", statusErr: "状态错误",
      tabSteward: "技能管家", tabFavorites: "收藏",
      discoverTtl: "发现页缓存有效期(秒)", discoverLimit: "发现页条数",
      cacheMaxAge: "缓存最大保留(秒)", browserHeadless: "无头浏览器",
      sandboxNetwork: "沙箱联网", restartNote: "部分改动重启后生效。",
      stewardDesc: "一个确定性的技能管家（不调大模型）。让它做体检、推荐、诊断、扫审计——或直接打命令。",
      qHealth: "体检", qRecommend: "推荐", qDiagnose: "诊断", qAudit: "扫审计", qAbout: "关于", qHelp: "帮助",
      promptPh: "输入指令或问题（如：推荐 github）...", send: "发送", thinking: "处理中...",
      stewardBoxTitle: "技能管家", connectHermes: "接入 Hermes",
      connectHint: "就在这里直接接入一个实时的 Hermes 智能体终端。点「连接」即通过仪表盘 PTY 开启真实会话。",
      agentComposerPh: "给 Hermes 智能体的提示词…", openChat: "打开完整对话 \u2197",
      termConnect: "连接", termDisconnect: "断开", termConnecting: "连接中",
      termOpen: "已连接", termClosed: "已断开", termErr: "错误",
      termUnavail: "终端组件加载失败 —— 请刷新页面重试。", overviewTitle: "概览",
      workspaceHint: "留空使用默认（~/.openclaw/workspace）。",
      loadFav: "加载收藏", noFav: "还没有收藏。点任意技能上的红心即可收藏到这里。", removeFav: "移除",
      detail: "详情", checkScore: "体检", scoring: "体检中", grade: "等级",
      dimensions: "评分维度", blockers: "阻碍项", capabilities: "能力", reliability: "实测可靠性",
      recRecommended: "推荐", recCaution: "谨慎", recNotRec: "不推荐",
      readiness: "就绪检查", checkReady: "检查就绪", ready: "已就绪", notReady: "未就绪",
      reqBin: "命令", reqKey: "API Key", present: "已具备", missing: "缺失",
      credentials: "凭据", credDeclared: "声明的密钥", credSet: "已设置", credNone: "未声明任何密钥。",
      credKeyPh: "密钥名（如 OPENAI_API_KEY）", credValPh: "值（留空=清除）", credSave: "保存", credSaved: "已保存",
      skillMd: "SKILL.md", filesLbl: "文件", saveFile: "保存", fileSaved: "已保存", fileLoad: "加载文件",
      smoketest: "冒烟测试", smoketesting: "测试中", entryPh: "入口（可选，自动探测）", runSmoke: "运行冒烟测试",
      smokeOk: "测试通过", smokeFail: "测试失败", smokeDoc: "纯文档型技能（无可运行脚本）。",
      updateAvail: "有更新", current: "当前", latest: "最新",
      exportImport: "导出 / 导入", exportBtn: "导出", importBtn: "导入", importing: "导入中",
      importPh: "在此粘贴技能清单 JSON...", copyJson: "复制", copied: "已复制", importDone: "导入完成",
      modeSearch: "搜索", modeDiscover: "发现", category: "分类", allCategories: "全部分类",
      discRecommended: "推荐", discRising: "上升", discHot: "热门", discNewest: "最新", loadingBoard: "加载榜单",
    },
  };
  function useL() {
    var ctx = {};
    try { ctx = (SDK.useI18n && SDK.useI18n()) || {}; } catch (x) { ctx = {}; }
    var lang = (ctx && ctx.locale) || "en";
    if (lang.indexOf("zh") === 0) return STR.zh;
    return STR[lang] || STR.en;
  }

  var BASE = "/api/plugins/omnilimb";
  function api(path, opts) { return SDK.fetchJSON(BASE + path, opts); }
  function post(path, body) {
    return api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  }

  function input(props) {
    return e("input", Object.assign({
      className: "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
    }, props));
  }
  function textarea(props) {
    return e("textarea", Object.assign({
      className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring",
    }, props));
  }
  function select(value, onChange, options, extra) {
    return e("select", Object.assign({
      value: value, onChange: onChange,
      className: "rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
    }, extra || {}), (options || []).map(function (o) {
      var val = o.value !== undefined ? o.value : o;
      var lab = o.label !== undefined ? o.label : o;
      return e("option", { key: String(val), value: val }, lab);
    }));
  }
  function muted(txt, cls) { return e("p", { className: cn("text-sm text-muted-foreground", cls) }, txt); }
  function gradeBadge(g) {
    if (!g) return null;
    var map = { A: "bg-green-500/15 text-green-400", B: "bg-sky-500/15 text-sky-400",
                C: "bg-amber-500/15 text-amber-400", D: "bg-red-500/15 text-red-400" };
    return e("span", { className: cn("rounded px-1.5 py-0.5 text-xs font-mono", map[g] || "bg-muted") }, g);
  }
  function errBox(msg) {
    return e("div", { className: "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" }, String(msg));
  }
  function spin(txt) { return muted(txt + "..."); }

  // ---- minimal, XSS-safe markdown → HTML for the butler's replies ----
  function mdEsc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function mdInline(s) {
    s = mdEsc(s);
    s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(127,127,127,.2);color:inherit;border-radius:4px;padding:0 4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em">$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');
    return s;
  }
  function mdToHtml(md) {
    var lines = String(md == null ? "" : md).split(/\r?\n/);
    var out = [], inList = false;
    function closeList() { if (inList) { out.push("</ul>"); inList = false; } }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var h = ln.match(/^(#{1,4})\s+(.+)/);
      if (h) { closeList(); out.push('<div class="mt-2 mb-0.5 font-semibold">' + mdInline(h[2]) + "</div>"); continue; }
      if (/^\s*[-*]\s+/.test(ln)) {
        if (!inList) { out.push('<ul class="my-1 list-disc space-y-1 pl-5 marker:text-muted-foreground">'); inList = true; }
        out.push('<li class="pl-0.5">' + mdInline(ln.replace(/^\s*[-*]\s+/, "")) + "</li>"); continue;
      }
      if (ln.trim() === "") { closeList(); continue; }
      closeList(); out.push('<p class="my-1">' + mdInline(ln) + "</p>");
    }
    closeList();
    return out.join("");
  }

  // ============================================================ Overview
  function Overview() {
    var L = useL();
    var st = useState(null), data = st[0], setData = st[1];
    var es = useState(null), err = es[0], setErr = es[1];
    useEffect(function () { api("/status").then(setData).catch(function (x) { setErr(String(x)); }); }, []);
    if (err) return errBox(err);
    if (!data) return spin(L.loading);
    if (data.ok === false) return errBox(data.error || L.statusErr);
    var cells = [
      [L.version, data.version], [L.edition, data.pro ? L.editionFree : "free"],
      [L.backend, (data.backend_configured || "?") + " \u2192 " + (data.backend_resolved || "?")],
      [L.market, data.market], [L.markets, data.markets_count],
      [L.runs, (data.runs && data.runs.total) || 0],
      [L.license, data.license], [L.workspace, data.workspace],
    ];
    return e("div", { className: "grid grid-cols-2 gap-3 md:grid-cols-4" },
      cells.map(function (c, i) {
        return e(Card, { key: i }, e(CardContent, { className: "p-3" },
          e("div", { className: "text-xs text-muted-foreground" }, c[0]),
          e("div", { className: "mt-1 truncate text-sm font-medium", title: String(c[1]) }, String(c[1] == null ? "\u2014" : c[1]))));
      }));
  }

  // ============================================================ Search
  function Search() {
    var L = useL();
    var mode_ = useState("search"), mode = mode_[0], setMode = mode_[1];
    var qs = useState(""), q = qs[0], setQ = qs[1];
    var ms = useState([]), markets = ms[0], setMarkets = ms[1];
    var mk = useState(""), market = mk[0], setMarket = mk[1];
    var ss = useState("downloads"), sort = ss[0], setSort = ss[1];
    var cats_ = useState([]), cats = cats_[0], setCats = cats_[1];
    var cat_ = useState(""), category = cat_[0], setCategory = cat_[1];
    var rs = useState(null), res = rs[0], setRes = rs[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    var es = useState(null), err = es[0], setErr = es[1];
    var ins = useState({}), installing = ins[0], setInstalling = ins[1];
    // discover state
    var dtab_ = useState("recommended"), dtab = dtab_[0], setDtab = dtab_[1];
    var dboards = useState({}), boards = dboards[0], setBoards = dboards[1];
    var dl_ = useState(false), dloading = dl_[0], setDloading = dl_[1];
    useEffect(function () {
      api("/markets").then(function (d) { setMarkets((d && d.markets) || []); }).catch(function () {});
    }, []);
    useEffect(function () {
      api("/categories?market=" + encodeURIComponent(market)).then(function (d) { setCats((d && d.categories) || []); }).catch(function () { setCats([]); });
    }, [market]);
    var run = useCallback(function () {
      setLoading(true); setErr(null);
      var qp = "?q=" + encodeURIComponent(q) + "&sort=" + encodeURIComponent(sort) +
               "&market=" + encodeURIComponent(market) + "&category=" + encodeURIComponent(category) + "&limit=15";
      api("/search" + qp).then(function (d) {
        setRes(d); setLoading(false);
        if (d && d.ok === false) setErr(d.error || "search failed");
      }).catch(function (x) { setErr(String(x)); setLoading(false); });
    }, [q, sort, market, category]);
    var loadBoard = useCallback(function (tab) {
      if (boards[tab]) return;
      setDloading(true);
      api("/discover?tab=" + encodeURIComponent(tab) + "&market=" + encodeURIComponent(market)).then(function (d) {
        setBoards(function (p) { var n = Object.assign({}, p); n[tab] = (d && d.skills) || []; return n; });
        setDloading(false);
      }).catch(function () { setDloading(false); });
    }, [market, boards]);
    useEffect(function () {
      if (mode === "discover") loadBoard(dtab);
    }, [mode, dtab, loadBoard]);
    useEffect(function () { setBoards({}); }, [market]);
    function finish(slug, state) {
      setInstalling(function (prev) { var n = Object.assign({}, prev); n[slug] = state; return n; });
    }
    function doInstall(slug) {
      finish(slug, "installing");
      post("/install", { slug: slug, market: market }).then(function (d) {
        var jid = d && d.id;
        if (!jid) { finish(slug, d && d.ok ? "done" : "failed"); return; }
        var poll = setInterval(function () {
          api("/install_status?id=" + encodeURIComponent(jid)).then(function (j) {
            if (j && (j.state === "done" || j.state === "failed")) {
              clearInterval(poll);
              finish(slug, j.state === "done" && (!j.result || j.result.ok !== false) ? "done" : "failed");
            }
          }).catch(function () { clearInterval(poll); finish(slug, "failed"); });
        }, 1500);
      }).catch(function () { finish(slug, "failed"); });
    }
    function skillCard(sk, i) {
      var slug = sk.slug || sk.name || sk.id || ("item-" + i);
      var s8 = installing[slug];
      return e(Card, { key: slug }, e(CardContent, { className: "flex items-start justify-between gap-3 p-3" },
        e("div", { className: "min-w-0" },
          e("div", { className: "flex items-center gap-2" },
            e("span", { className: "truncate text-sm font-medium" }, slug),
            gradeBadge(sk.grade), sk.verified ? e(Badge, { variant: "secondary" }, L.verified) : null),
          muted((sk.summary || sk.description || "").slice(0, 160), "mt-1 line-clamp-2"),
          e("div", { className: "mt-1 text-xs text-muted-foreground" },
            "\u2193 " + (sk.downloads || 0) + "  \u2605 " + (sk.stars || 0) + (sk.score != null ? ("  score " + sk.score) : ""))),
        e(Button, { size: "sm", variant: s8 === "done" ? "secondary" : "default",
          disabled: s8 === "installing" || s8 === "done", onClick: function () { doInstall(slug); } },
          s8 === "installing" ? L.installing : s8 === "done" ? L.installed : s8 === "failed" ? L.retry : L.install)));
    }
    var marketOpts = [{ value: "", label: L.defaultOpt }].concat(markets.map(function (m) {
      return { value: m.id, label: m.label || m.id };
    }));
    var catOpts = [{ value: "", label: L.allCategories }].concat((cats || []).map(function (c) {
      var v = (typeof c === "string") ? c : (c.slug || c.id || c.name);
      var lab = (typeof c === "string") ? c : (c.label || c.name || c.slug || c.id);
      return { value: v, label: lab };
    }));
    var modeBar = e("div", { className: "flex gap-1" }, [["search", L.modeSearch], ["discover", L.modeDiscover]].map(function (m) {
      var on = m[0] === mode;
      return e("button", { key: m[0], onClick: function () { setMode(m[0]); },
        className: cn("rounded-md px-3 py-1 text-sm transition-colors", on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted") }, m[1]);
    }));
    if (mode === "discover") {
      var dskills = boards[dtab] || [];
      var dboardsTabs = [["recommended", L.discRecommended], ["rising", L.discRising], ["hot", L.discHot], ["newest", L.discNewest]];
      return e("div", { className: "space-y-3" },
        e("div", { className: "flex flex-wrap items-center gap-2" }, modeBar,
          e("div", { className: "flex-1" }),
          select(market, function (ev) { setMarket(ev.target.value); }, marketOpts)),
        e("div", { className: "flex flex-wrap gap-1" }, dboardsTabs.map(function (t) {
          var on = t[0] === dtab;
          return e("button", { key: t[0], onClick: function () { setDtab(t[0]); },
            className: cn("rounded-md px-3 py-1 text-sm transition-colors", on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted") }, t[1]);
        })),
        dloading && dskills.length === 0 ? spin(L.loadingBoard) : null,
        e("div", { className: "space-y-2" }, dskills.map(skillCard)),
        (!dloading && dskills.length === 0 && boards[dtab]) ? muted(L.noResults) : null);
    }
    var skills = (res && (res.skills || res.results)) || [];
    return e("div", { className: "space-y-3" },
      e("div", { className: "flex flex-wrap items-center gap-2" }, modeBar,
        e("div", { className: "min-w-[200px] flex-1" },
          input({ value: q, placeholder: L.searchPh,
                  onChange: function (ev) { setQ(ev.target.value); },
                  onKeyDown: function (ev) { if (ev.key === "Enter") run(); } })),
        select(market, function (ev) { setMarket(ev.target.value); }, marketOpts),
        select(category, function (ev) { setCategory(ev.target.value); }, catOpts),
        select(sort, function (ev) { setSort(ev.target.value); },
          [{ value: "downloads", label: L.sortDownloads }, { value: "stars", label: L.sortStars },
           { value: "latest", label: L.sortNewest }, { value: "relevance", label: L.sortRelevance }]),
        e(Button, { onClick: run, disabled: loading }, loading ? L.searching : L.searchBtn)),
      err ? errBox(err) : null,
      loading ? spin(L.searchingMsg) : null,
      e("div", { className: "space-y-2" }, skills.map(skillCard)),
      (!loading && skills.length === 0 && res) ? muted(L.noResults) : null);
  }

  // ---- shared label helpers for skill detail ----
  function recLabel(L, rec) {
    if (rec === "recommended") return L.recRecommended;
    if (rec === "not_recommended") return L.recNotRec;
    return L.recCaution;
  }
  function recColor(rec) {
    if (rec === "recommended") return "text-green-400";
    if (rec === "not_recommended") return "text-red-400";
    return "text-amber-400";
  }

  // ---- Score (体检) sub-view ----
  function ScoreView(props) {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    function run() {
      setLoading(true);
      api("/skill_score?slug=" + encodeURIComponent(props.slug)).then(function (d) {
        setData(d); setLoading(false);
      }).catch(function (x) { setData({ ok: false, error: String(x) }); setLoading(false); });
    }
    if (!data && !loading) {
      return e(Button, { size: "sm", variant: "secondary", onClick: run }, L.checkScore);
    }
    if (loading) return spin(L.scoring);
    if (data.ok === false) return errBox(data.error || "error");
    return e("div", { className: "space-y-2" },
      e("div", { className: "flex items-center gap-2" },
        e("span", { className: "text-2xl font-semibold" }, String(data.score)),
        gradeBadge(data.grade),
        e("span", { className: cn("text-sm font-medium", recColor(data.recommendation)) }, recLabel(L, data.recommendation)),
        e("div", { className: "flex-1" }),
        e(Button, { size: "sm", variant: "ghost", onClick: run }, L.checkScore)),
      (data.dimensions || []).map(function (d, i) {
        var pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
        return e("div", { key: i, className: "space-y-0.5" },
          e("div", { className: "flex items-center justify-between text-xs" },
            e("span", { className: "text-muted-foreground" }, d.name),
            e("span", { className: "font-mono" }, d.score + "/" + d.max)),
          e("div", { className: "h-1.5 w-full overflow-hidden rounded bg-muted" },
            e("div", { className: "h-full bg-primary", style: { width: pct + "%" } })),
          d.reasons && d.reasons.length ? e("div", { className: "text-xs text-muted-foreground" }, d.reasons.join(" \u00b7 ")) : null);
      }),
      data.reliability ? e("div", { className: "text-xs text-muted-foreground" }, L.reliability + ": " + (data.reliability.note || "")) : null,
      data.blockers && data.blockers.length ? errBox(L.blockers + ": " + data.blockers.join("; ")) : null,
      data.capabilities && data.capabilities.length ? e("div", { className: "flex flex-wrap gap-1" },
        data.capabilities.map(function (c, i) { return e(Badge, { key: i, variant: "secondary" }, c); })) : null);
  }

  // ---- Readiness (就绪检查) sub-view ----
  function ReadinessView(props) {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    function run() {
      setLoading(true);
      api("/skill_requirements?slug=" + encodeURIComponent(props.slug)).then(function (d) {
        setData(d); setLoading(false);
      }).catch(function (x) { setData({ ok: false, error: String(x) }); setLoading(false); });
    }
    if (!data && !loading) return e(Button, { size: "sm", variant: "secondary", onClick: run }, L.checkReady);
    if (loading) return spin(L.checkReady);
    if (data.ok === false) return errBox(data.error || "error");
    var checks = data.checks || [];
    return e("div", { className: "space-y-1" },
      e("div", { className: "flex items-center gap-2" },
        e("span", { className: cn("text-sm font-medium", data.ready ? "text-green-400" : "text-amber-400") },
          data.ready ? L.ready : L.notReady),
        e("div", { className: "flex-1" }),
        e(Button, { size: "sm", variant: "ghost", onClick: run }, L.checkReady)),
      checks.length === 0 ? muted("\u2014") : checks.map(function (c, i) {
        return e("div", { key: i, className: "flex items-center gap-2 text-xs" },
          e("span", { className: c.ok ? "text-green-400" : "text-red-400" }, c.ok ? "\u2713" : "\u2717"),
          e("span", { className: "rounded bg-muted px-1 py-0.5 font-mono" }, c.type === "key" ? L.reqKey : L.reqBin),
          e("span", { className: "font-mono" }, c.name),
          e("span", { className: "text-muted-foreground" }, c.ok ? L.present : L.missing));
      }));
  }

  // ---- Credentials (凭据) sub-view ----
  function CredentialsView(props) {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var ks = useState(""), key = ks[0], setKey = ks[1];
    var vs = useState(""), val = vs[0], setVal = vs[1];
    var ss = useState(""), saved = ss[0], setSaved = ss[1];
    function load() { api("/skill_credentials?slug=" + encodeURIComponent(props.slug)).then(setData).catch(function () { setData({ ok: false }); }); }
    useEffect(load, []);
    function save() {
      if (!key.trim()) return;
      post("/skill_credentials", { slug: props.slug, key: key.trim(), value: val }).then(function (d) {
        setData(function (p) { return Object.assign({}, p, { set: (d && d.set) || (p && p.set) }); });
        setKey(""); setVal(""); setSaved(L.credSaved); setTimeout(function () { setSaved(""); }, 2000);
      }).catch(function () {});
    }
    if (!data) return spin(L.loading);
    var declared = data.declared || [];
    var setKeys = data.set || [];
    return e("div", { className: "space-y-2" },
      declared.length === 0 ? muted(L.credNone) :
      e("div", { className: "flex flex-wrap gap-1" }, declared.map(function (k, i) {
        var has = setKeys.indexOf(k) >= 0;
        return e("span", { key: i, className: cn("rounded px-1.5 py-0.5 text-xs font-mono",
          has ? "bg-green-500/15 text-green-400" : "bg-muted text-muted-foreground") },
          (has ? "\u2713 " : "") + k);
      })),
      e("div", { className: "flex flex-wrap items-center gap-2" },
        e("div", { className: "min-w-[160px] flex-1" }, input({ value: key, placeholder: L.credKeyPh, onChange: function (ev) { setKey(ev.target.value); } })),
        e("div", { className: "min-w-[160px] flex-1" }, input({ type: "password", value: val, placeholder: L.credValPh, onChange: function (ev) { setVal(ev.target.value); } })),
        e(Button, { size: "sm", onClick: save, disabled: !key.trim() }, L.credSave),
        saved ? muted(saved, "text-xs") : null));
  }

  // ---- SKILL.md view/edit sub-view ----
  function SkillMdView(props) {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var ps = useState(""), path = ps[0], setPath = ps[1];
    var cs = useState(""), content = cs[0], setContent = cs[1];
    var ls = useState(false), loadingF = ls[0], setLoadingF = ls[1];
    var ss = useState(""), saved = ss[0], setSaved = ss[1];
    useEffect(function () {
      api("/skill?slug=" + encodeURIComponent(props.slug)).then(function (d) {
        setData(d);
        if (d && d.ok !== false) {
          var files = d.files || [];
          var md = null;
          files.forEach(function (f) { if (f.toLowerCase() === "skill.md") md = f; });
          var first = md || files[0] || "";
          setPath(first);
          setContent(d.skill_md || "");
          if (first && first.toLowerCase() !== "skill.md") loadFile(first);
        }
      }).catch(function (x) { setData({ ok: false, error: String(x) }); });
    }, []);
    function loadFile(p) {
      setLoadingF(true);
      api("/skill_file?slug=" + encodeURIComponent(props.slug) + "&path=" + encodeURIComponent(p)).then(function (d) {
        setContent(d && d.ok !== false ? (d.content || "") : ("[" + (d && d.error) + "]"));
        setLoadingF(false);
      }).catch(function (x) { setContent("[" + x + "]"); setLoadingF(false); });
    }
    function pick(p) {
      setPath(p);
      if (data && p.toLowerCase() === "skill.md" && data.skill_md != null) { setContent(data.skill_md); }
      else loadFile(p);
    }
    function save() {
      post("/skill_file", { slug: props.slug, path: path, content: content }).then(function (d) {
        setSaved(d && d.ok !== false ? L.fileSaved : (d && d.error) || "error");
        setTimeout(function () { setSaved(""); }, 2500);
      }).catch(function () { setSaved("error"); });
    }
    if (!data) return spin(L.loading);
    if (data.ok === false) return errBox(data.error || "error");
    var files = data.files || [];
    return e("div", { className: "space-y-2" },
      e("div", { className: "flex flex-wrap items-center gap-2" },
        select(path, function (ev) { pick(ev.target.value); }, files.map(function (f) { return { value: f, label: f }; })),
        e(Button, { size: "sm", onClick: save }, L.saveFile),
        saved ? muted(saved, "text-xs") : null),
      loadingF ? spin(L.fileLoad) :
      textarea({ rows: 14, value: content, onChange: function (ev) { setContent(ev.target.value); } }));
  }

  // ---- Smoke test sub-view ----
  function SmoketestView(props) {
    var L = useL();
    var es = useState(""), entry = es[0], setEntry = es[1];
    var rs = useState(null), res = rs[0], setRes = rs[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    function run() {
      setLoading(true); setRes(null);
      post("/skill_smoketest", { slug: props.slug, entry: entry.trim() || undefined }).then(function (d) {
        setRes(d); setLoading(false);
      }).catch(function (x) { setRes({ ok: false, error: String(x) }); setLoading(false); });
    }
    return e("div", { className: "space-y-2" },
      e("div", { className: "flex flex-wrap items-center gap-2" },
        e("div", { className: "min-w-[200px] flex-1" }, input({ value: entry, placeholder: L.entryPh, onChange: function (ev) { setEntry(ev.target.value); } })),
        e(Button, { size: "sm", onClick: run, disabled: loading }, loading ? L.smoketesting : L.runSmoke)),
      loading ? spin(L.smoketesting) : null,
      res ? (res.ok
        ? e(Card, null, e(CardContent, { className: "p-2 text-xs" },
            e("div", { className: "font-medium text-green-400" }, "\u2713 " + L.smokeOk + (res.entry ? (" (" + res.entry + ")") : "")),
            res.output ? e("pre", { className: "mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono" }, String(res.output).slice(0, 2000)) : null))
        : (res.kind === "doc"
            ? muted(L.smokeDoc + (res.friendly && res.friendly.fix ? (" " + res.friendly.fix) : ""))
            : errBox((res.friendly && res.friendly.reason) || res.error || L.smokeFail))) : null);
  }

  // ---- per-skill expandable detail ----
  function SkillDetail(props) {
    var L = useL();
    var ss = useState("score"), sub = ss[0], setSub = ss[1];
    var subs = [["score", L.checkScore], ["readiness", L.readiness], ["credentials", L.credentials],
                ["skillmd", L.skillMd], ["smoketest", L.smoketest]];
    var body = sub === "readiness" ? e(ReadinessView, { slug: props.slug })
      : sub === "credentials" ? e(CredentialsView, { slug: props.slug })
      : sub === "skillmd" ? e(SkillMdView, { slug: props.slug })
      : sub === "smoketest" ? e(SmoketestView, { slug: props.slug })
      : e(ScoreView, { slug: props.slug });
    return e("div", { className: "mt-2 space-y-2 border-t border-border pt-2" },
      e("div", { className: "flex flex-wrap gap-1" }, subs.map(function (t) {
        var on = t[0] === sub;
        return e("button", { key: t[0], onClick: function () { setSub(t[0]); },
          className: cn("rounded px-2 py-1 text-xs transition-colors",
            on ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted") }, t[1]);
      })),
      e("div", null, body));
  }

  // ============================================================ Installed
  function Installed() {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var es = useState(null), err = es[0], setErr = es[1];
    var bs = useState({}), busy = bs[0], setBusy = bs[1];
    var us = useState({}), updates = us[0], setUpdates = us[1];
    var xs = useState(""), expanded = xs[0], setExpanded = xs[1];
    var io = useState(null), impExp = io[0], setImpExp = io[1];
    function load() { api("/installed").then(setData).catch(function (x) { setErr(String(x)); }); }
    useEffect(load, []);
    useEffect(function () {
      api("/skill_updates").then(function (d) { setUpdates((d && d.updates) || {}); }).catch(function () {});
    }, []);
    function mark(slug, v) { setBusy(function (p) { var n = Object.assign({}, p); n[slug] = v; return n; }); }
    function uninstall(slug) {
      if (!window.confirm(L.confirmUninstall + " (" + slug + ")")) return;
      mark(slug, "working");
      post("/uninstall", { slug: slug }).then(function () { mark(slug, null); load(); }).catch(function () { mark(slug, null); });
    }
    function convert(slug) {
      mark(slug, "converting");
      post("/convert", { slug: slug, mode: "ai_curated", overwrite: true }).then(function (d) {
        mark(slug, d && d.ok ? "converted" : "failed");
      }).catch(function () { mark(slug, "failed"); });
    }
    if (err) return errBox(err);
    if (!data) return spin(L.loadInstalled);
    var skills = (data.skills) || [];
    return e("div", { className: "space-y-2" },
      e("div", { className: "flex items-center gap-2" },
        e(Button, { size: "sm", variant: "secondary", onClick: function () { setImpExp(impExp === "io" ? null : "io"); } }, L.exportImport)),
      impExp === "io" ? e(ImportExport, { onDone: load }) : null,
      skills.length === 0 ? muted(L.noInstalled) :
      e("div", { className: "space-y-2" }, skills.map(function (sk, i) {
        var slug = sk.slug || sk.name || ("s" + i);
        var b = busy[slug];
        var upd = updates[slug];
        var open = expanded === slug;
        return e(Card, { key: slug }, e(CardContent, { className: "p-3" },
          e("div", { className: "flex items-center justify-between gap-3" },
            e("div", { className: "min-w-0 cursor-pointer", onClick: function () { setExpanded(open ? "" : slug); } },
              e("div", { className: "flex items-center gap-2" },
                e("span", { className: "text-xs text-muted-foreground" }, open ? "\u25be" : "\u25b8"),
                e("span", { className: "truncate text-sm font-medium" }, slug),
                (upd && upd.update_available) ? e("span", { className: "rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-400" },
                  L.updateAvail + (upd.latest ? (" " + upd.latest) : "")) : null),
              e("div", { className: "mt-0.5 text-xs text-muted-foreground" },
                L.calls + " " + (sk.calls || 0) + (sk.last_ts ? ("  \u00b7  " + L.last + " " + (SDK.utils && SDK.utils.timeAgo ? SDK.utils.timeAgo(sk.last_ts) : sk.last_ts)) : "") +
                (sk.version ? ("  \u00b7  v" + sk.version) : ""))),
            e("div", { className: "flex shrink-0 gap-2" },
              e(Button, { size: "sm", variant: "secondary", disabled: b === "converting" || b === "converted",
                onClick: function () { convert(slug); } },
                b === "converting" ? L.converting : b === "converted" ? L.convertedW : b === "failed" ? L.retryConvert : L.toHermes),
              e(Button, { size: "sm", variant: "destructive", disabled: b === "working",
                onClick: function () { uninstall(slug); } }, L.uninstall))),
          open ? e(SkillDetail, { slug: slug }) : null));
      })));
  }

  // ---- Import / Export panel ----
  function ImportExport(props) {
    var L = useL();
    var ts = useState(""), text = ts[0], setText = ts[1];
    var cs = useState(""), copied = cs[0], setCopied = cs[1];
    var ls = useState(false), busy = ls[0], setBusy = ls[1];
    var rs = useState(null), res = rs[0], setRes = rs[1];
    function doExport() {
      api("/export_skills").then(function (d) {
        setText(JSON.stringify({ skills: (d && d.skills) || [] }, null, 2));
      }).catch(function () {});
    }
    function doCopy() {
      try { navigator.clipboard.writeText(text); setCopied(L.copied); setTimeout(function () { setCopied(""); }, 1500); } catch (x) {}
    }
    function doImport() {
      var manifest;
      try { manifest = JSON.parse(text); } catch (x) { setRes({ ok: false, error: String(x) }); return; }
      setBusy(true); setRes(null);
      post("/import_skills", { manifest: manifest }).then(function (d) {
        setRes(d); setBusy(false); if (props.onDone) props.onDone();
      }).catch(function (x) { setRes({ ok: false, error: String(x) }); setBusy(false); });
    }
    return e(Card, null, e(CardContent, { className: "space-y-2 p-3" },
      e("div", { className: "flex flex-wrap items-center gap-2" },
        e(Button, { size: "sm", variant: "secondary", onClick: doExport }, L.exportBtn),
        e(Button, { size: "sm", variant: "secondary", onClick: doCopy, disabled: !text }, L.copyJson),
        e(Button, { size: "sm", onClick: doImport, disabled: busy || !text.trim() }, busy ? L.importing : L.importBtn),
        copied ? muted(copied, "text-xs") : null),
      textarea({ rows: 6, value: text, placeholder: L.importPh, onChange: function (ev) { setText(ev.target.value); } }),
      res ? (res.ok
        ? muted(L.importDone + " (" + (res.count || 0) + ")")
        : (res.results
            ? e("div", { className: "space-y-0.5 text-xs" }, res.results.map(function (r, i) {
                return e("div", { key: i, className: r.ok ? "text-green-400" : "text-red-400" },
                  (r.ok ? "\u2713 " : "\u2717 ") + r.slug + (r.error ? (" — " + r.error) : ""));
              }))
            : errBox(res.error || "error"))) : null));
  }

  // ============================================================ Converted
  function Converted() {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var es = useState(null), err = es[0], setErr = es[1];
    function load() { api("/converted_skills").then(setData).catch(function (x) { setErr(String(x)); }); }
    useEffect(load, []);
    function uninstall(name) {
      if (!window.confirm(L.confirmRemove + " (" + name + ")")) return;
      post("/converted_uninstall", { name: name }).then(load).catch(function () {});
    }
    if (err) return errBox(err);
    if (!data) return spin(L.loadConverted);
    var skills = (data.skills) || (data.converted) || [];
    if (skills.length === 0) return muted(L.noConverted);
    return e("div", { className: "space-y-2" }, skills.map(function (sk, i) {
      var name = sk.name || sk.slug || ("c" + i);
      return e(Card, { key: name }, e(CardContent, { className: "flex items-center justify-between gap-3 p-3" },
        e("div", { className: "min-w-0" },
          e("div", { className: "truncate text-sm font-medium" }, name),
          muted((sk.description || "").slice(0, 140), "mt-0.5 line-clamp-2")),
        e(Button, { size: "sm", variant: "destructive", onClick: function () { uninstall(name); } }, L.remove)));
    }));
  }

  // ============================================================ Learn (1.0)
  function Learn() {
    var L = useL();
    var ss = useState(""), src = ss[0], setSrc = ss[1];
    var ts = useState("auto"), stype = ts[0], setStype = ts[1];
    var ms = useState("ai_curated"), mode = ms[0], setMode = ms[1];
    var ns = useState(""), name = ns[0], setName = ns[1];
    var rs = useState(null), res = rs[0], setRes = rs[1];
    var ls = useState(false), loading = ls[0], setLoading = ls[1];
    function run() {
      if (!src.trim()) return;
      setLoading(true); setRes(null);
      post("/learn", { source: src.trim(), source_type: stype, mode: mode, name: name.trim() || undefined, overwrite: true })
        .then(function (d) { setRes(d); setLoading(false); })
        .catch(function (x) { setRes({ ok: false, error: String(x) }); setLoading(false); });
    }
    return e("div", { className: "space-y-3" },
      muted(L.learnDesc),
      e("div", { className: "flex flex-wrap gap-2" },
        select(stype, function (ev) { setStype(ev.target.value); },
          [{ value: "auto", label: L.autoDetect }, { value: "path", label: L.typePath },
           { value: "url", label: L.typeUrl }, { value: "text", label: L.typeText }]),
        select(mode, function (ev) { setMode(ev.target.value); },
          [{ value: "ai_curated", label: L.modeAi }, { value: "deterministic", label: L.modeDet }]),
        e("div", { className: "min-w-[160px] flex-1" },
          input({ value: name, placeholder: L.namePh, onChange: function (ev) { setName(ev.target.value); } }))),
      textarea({ rows: 6, value: src, placeholder: L.srcPh, onChange: function (ev) { setSrc(ev.target.value); } }),
      e("div", null, e(Button, { onClick: run, disabled: loading || !src.trim() }, loading ? L.learning : L.learnBtn)),
      res ? (res.ok
        ? e(Card, null, e(CardContent, { className: "p-3 text-sm" },
            e("div", { className: "font-medium text-green-400" }, "\u2713 " + (res.status || "learned") + ": " + (res.name || "")),
            muted(res.description || "", "mt-1"),
            res.output_path ? e("div", { className: "mt-1 text-xs font-mono text-muted-foreground" }, res.output_path) : null,
            (res.fell_back ? muted(L.fellBack, "mt-1 text-xs") : null)))
        : errBox(res.error || L.learnFail)) : null);
  }

  // ============================================================ Audit
  function Audit() {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var ts = useState(""), tool = ts[0], setTool = ts[1];
    function load(t) { api("/audit?limit=200" + (t ? "&tool=" + encodeURIComponent(t) : "")).then(setData).catch(function () {}); }
    useEffect(function () { load(""); }, []);
    if (!data) return spin(L.loadAudit);
    var recs = data.records || [];
    return e("div", { className: "space-y-3" },
      e("div", { className: "flex items-center gap-2" },
        muted(data.enabled ? L.auditOn : L.auditOff),
        e("div", { className: "flex-1" }),
        select(tool, function (ev) { setTool(ev.target.value); load(ev.target.value); },
          [{ value: "", label: L.allTools }].concat((data.tools || []).map(function (t) { return { value: t, label: t }; })))),
      recs.length === 0 ? muted(L.noAudit) :
      e("div", { className: "max-h-[60vh] overflow-auto rounded-md border border-border" },
        e("table", { className: "w-full text-xs" }, e("tbody", null, recs.map(function (r, i) {
          return e("tr", { key: i, className: "border-b border-border/50" },
            e("td", { className: "px-2 py-1 font-mono text-muted-foreground" }, r.ts ? (SDK.utils && SDK.utils.timeAgo ? SDK.utils.timeAgo(r.ts) : r.ts) : ""),
            e("td", { className: "px-2 py-1 font-mono" }, r.tool || ""),
            e("td", { className: "px-2 py-1" }, e("span", { className: r.ok ? "text-green-400" : "text-red-400" }, r.ok ? L.ok : L.fail)));
        })))));
  }

  // ============================================================ Settings
  function Settings() {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    var sv = useState(""), saved = sv[0], setSaved = sv[1];
    var ws = useState(null), status = ws[0], setStatus = ws[1];
    function load() {
      api("/settings").then(function (d) { setData((d && d.settings) || {}); }).catch(function () { setData({}); });
    }
    useEffect(load, []);
    useEffect(function () {
      api("/status").then(function (d) { if (d) setStatus(d); }).catch(function () {});
    }, []);
    function setField(k, v) { setData(function (p) { var n = Object.assign({}, p); n[k] = v; return n; }); }
    function save() {
      var keys = ["backend", "market", "workspace", "discover_ttl_s", "discover_limit",
                  "cache_enabled", "cache_max_age_s", "audit_log", "sandbox_enabled", "sandbox_image",
                  "browser_headless", "sandbox_network"];
      var body = {};
      keys.forEach(function (k) { if (data[k] !== undefined) body[k] = data[k]; });
      post("/settings", { settings: body }).then(function (r) {
        setSaved(r && r.ok === false ? (r.error || L.saveFailed) : L.saved);
        setTimeout(function () { setSaved(""); }, 2500); load();
      }).catch(function () { setSaved(L.saveFailed); });
    }
    if (!data) return spin(L.loadSettings);
    function row(label, ctrl) {
      return e("div", { className: "flex items-center justify-between gap-3 py-1.5" },
        e("span", { className: "text-sm text-muted-foreground" }, label), ctrl);
    }
    function toggle(k) {
      return e("input", { type: "checkbox", checked: !!data[k], className: "h-4 w-4",
        onChange: function (ev) { setField(k, ev.target.checked); } });
    }
    function txt(k, w, ph) {
      return input({ value: data[k] == null ? "" : data[k], placeholder: ph || "",
        className: cn(w || "w-40", "rounded-md border border-border bg-background px-2 py-1 text-sm"),
        onChange: function (ev) { setField(k, ev.target.value); } });
    }
    function num(k) {
      return e("input", { type: "number", value: data[k] == null ? "" : data[k],
        className: "w-28 rounded-md border border-border bg-background px-2 py-1 text-sm",
        onChange: function (ev) { setField(k, ev.target.value === "" ? "" : Number(ev.target.value)); } });
    }
    return e("div", { className: "space-y-4" },
      e(Card, null, e(CardContent, { className: "space-y-1 p-4" },
      e("div", { className: "text-sm font-medium text-muted-foreground" }, L.tabs.settings),
      row(L.backend, select(data.backend || "auto", function (ev) { setField("backend", ev.target.value); },
        [{ value: "auto", label: "auto" }, { value: "cli", label: "cli" }, { value: "native", label: "native" }])),
      row(L.market, txt("market")),
      e("div", { className: "py-1.5" },
        e("div", { className: "flex items-center justify-between gap-3" },
          e("span", { className: "text-sm text-muted-foreground" }, L.workspace),
          txt("workspace", "w-72", (status && status.workspace) || "")),
        muted(L.workspaceHint, "mt-0.5 text-xs")),
      row(L.sandboxEnabled, toggle("sandbox_enabled")),
      row(L.sandboxImage, txt("sandbox_image", "w-56")),
      row(L.sandboxNetwork, toggle("sandbox_network")),
      row(L.browserHeadless, toggle("browser_headless")),
      row(L.auditLogRec, toggle("audit_log")),
      row(L.cacheEnabled, toggle("cache_enabled")),
      row(L.discoverTtl, num("discover_ttl_s")),
      row(L.discoverLimit, num("discover_limit")),
      row(L.cacheMaxAge, num("cache_max_age_s")),
      e(Separator, { className: "my-2" }),
      muted(L.restartNote, "text-xs"),
      e("div", { className: "mt-2 flex items-center gap-3" },
        e(Button, { size: "sm", onClick: save }, L.saveSettings), saved ? muted(saved) : null))),
      // compact overview at the bottom
      OverviewCompact(L, status));
  }

  // Compact, inline overview — a small key/value strip (used at the bottom of Settings).
  function OverviewCompact(L, d) {
    if (!d || d.ok === false) return null;
    var cells = [
      [L.version, d.version], [L.edition, d.pro ? L.editionFree : "free"],
      [L.backend, (d.backend_configured || "?") + " \u2192 " + (d.backend_resolved || "?")],
      [L.market, d.market], [L.markets, d.markets_count],
      [L.runs, (d.runs && d.runs.total) || 0],
      [L.license, d.license], [L.workspace, d.workspace],
    ];
    return e("div", { className: "rounded-md border border-border/60 px-3 py-2" },
      e("div", { className: "mb-1 text-xs font-medium text-muted-foreground" }, L.overviewTitle),
      e("div", { className: "flex flex-wrap gap-x-4 gap-y-1" }, cells.map(function (c, i) {
        return e("div", { key: i, className: "flex items-baseline gap-1 text-xs" },
          e("span", { className: "text-muted-foreground" }, c[0] + ":"),
          e("span", { className: "max-w-[220px] truncate font-medium", title: String(c[1]) }, String(c[1] == null ? "\u2014" : c[1])));
      })));
  }

  // ============================================================ Steward (Connect Hermes)
  // Lazy-load the xterm UMD bundle + fit addon shipped alongside this plugin.
  var XTERM_BASE = "/dashboard-plugins/omnilimb/dist/";
  function loadXterm() {
    return new Promise(function (resolve, reject) {
      if (window.Terminal && window.FitAddon) return resolve();
      if (!document.getElementById("omni-xterm-css")) {
        var lnk = document.createElement("link");
        lnk.id = "omni-xterm-css"; lnk.rel = "stylesheet"; lnk.href = XTERM_BASE + "xterm.css";
        document.head.appendChild(lnk);
      }
      function inject(id, src, ready, cb) {
        if (ready()) return cb();
        var ex = document.getElementById(id);
        if (ex) { ex.addEventListener("load", cb); ex.addEventListener("error", function () { reject(new Error(src)); }); return; }
        var s = document.createElement("script");
        s.id = id; s.src = src; s.onload = cb; s.onerror = function () { reject(new Error(src)); };
        document.head.appendChild(s);
      }
      inject("omni-xterm-js", XTERM_BASE + "xterm.umd.js", function () { return !!window.Terminal; }, function () {
        inject("omni-xterm-fit", XTERM_BASE + "addon-fit.js", function () { return !!window.FitAddon; }, function () { resolve(); });
      });
    });
  }

  // Live embedded Hermes agent terminal over the dashboard PTY (/api/pty),
  // matching the original 0.80 "Connect Hermes" behaviour.
  function HermesTerminal() {
    var L = useL();
    var hostRef = useRef(null);
    var on = useState(false), connected = on[0], setConnected = on[1];
    var cs = useState("idle"), conn = cs[0], setConn = cs[1];
    useEffect(function () {
      if (!connected) return undefined;
      var host = hostRef.current;
      if (!host) return undefined;
      var S = { unmounting: false, ws: null, term: null, fit: null, dataDisp: null, ro: null, tmr: null, onResize: null };
      setConn("connecting");
      loadXterm().then(function () {
        if (S.unmounting) return;
        S.term = new window.Terminal({
          cursorBlink: true, fontSize: 13, scrollback: 4000,
          fontFamily: "ui-monospace, 'Cascadia Mono', 'JetBrains Mono', Consolas, monospace",
          theme: { background: "#0d1f1f", foreground: "#e6f0ea", cursor: "#e6f0ea" },
        });
        try { S.fit = new window.FitAddon.FitAddon(); S.term.loadAddon(S.fit); } catch (x) { S.fit = null; }
        S.term.open(host);
        try { if (S.fit) S.fit.fit(); } catch (x) {}
        function refit() {
          try { if (S.fit) S.fit.fit(); } catch (x) {}
          if (S.ws && S.ws.readyState === 1) S.ws.send("\x1b[RESIZE:" + S.term.cols + ";" + S.term.rows + "]");
        }
        var channel = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("ex-" + Date.now().toString(36));
        SDK.buildWsUrl("/api/pty", { channel: channel }).then(function (url) {
          if (S.unmounting) return;
          S.ws = new WebSocket(url); S.ws.binaryType = "arraybuffer";
          S.ws.onopen = function () { setConn("open"); S.ws.send("\x1b[RESIZE:" + S.term.cols + ";" + S.term.rows + "]"); };
          S.ws.onmessage = function (ev) { if (typeof ev.data === "string") S.term.write(ev.data); else S.term.write(new Uint8Array(ev.data)); };
          S.ws.onclose = function () { if (!S.unmounting) setConn("closed"); };
          S.ws.onerror = function () { if (!S.unmounting) setConn("error"); };
          S.dataDisp = S.term.onData(function (d) { if (S.ws && S.ws.readyState === 1) S.ws.send(d); });
        }).catch(function () { if (!S.unmounting) setConn("error"); });
        try { S.ro = new ResizeObserver(function () { refit(); }); S.ro.observe(host); } catch (x) { S.ro = null; }
        S.onResize = function () { refit(); };
        window.addEventListener("resize", S.onResize);
        S.tmr = setTimeout(refit, 250);
      }).catch(function () { if (!S.unmounting) setConn("error"); });
      return function () {
        S.unmounting = true;
        if (S.tmr) clearTimeout(S.tmr);
        if (S.onResize) window.removeEventListener("resize", S.onResize);
        if (S.ro) { try { S.ro.disconnect(); } catch (x) {} }
        if (S.dataDisp) { try { S.dataDisp.dispose(); } catch (x) {} }
        if (S.ws) { try { S.ws.close(); } catch (x) {} }
        if (S.term) { try { S.term.dispose(); } catch (x) {} }
      };
    }, [connected]);
    function statusBadge() {
      var map = { open: "text-green-400", connecting: "text-amber-400", closed: "text-muted-foreground", error: "text-red-400" };
      var lab = { open: L.termOpen, connecting: L.termConnecting, closed: L.termClosed, error: L.termErr, idle: "" };
      if (!lab[conn]) return null;
      return e("span", { className: cn("text-xs", map[conn] || "text-muted-foreground") }, lab[conn]);
    }
    return e(Card, null, e(CardContent, { className: "space-y-2 p-3" },
      e("div", { className: "flex items-center gap-2" },
        e("span", { className: "text-sm font-medium" }, L.connectHermes),
        statusBadge(),
        e("div", { className: "flex-1" }),
        e(Button, { size: "sm", variant: connected ? "destructive" : "default",
          onClick: function () { setConnected(!connected); setConn("idle"); } }, connected ? L.termDisconnect : L.termConnect)),
      muted(L.connectHint, "text-xs"),
      connected ? e("div", { ref: hostRef,
        className: "h-80 w-full overflow-hidden rounded-md border border-border", style: { background: "#0d1f1f" } }) : null,
      conn === "error" ? errBox(L.termUnavail) : null));
  }

  function Steward() {
    var L = useL();
    var sb = useState("butler"), sub = sb[0], setSub = sb[1];
    var rs = useState(null), result = rs[0], setResult = rs[1];   // {label, text} — single result, replaced each click
    var qs = useState(""), q = qs[0], setQ = qs[1];
    var ls = useState(false), sending = ls[0], setSending = ls[1];
    var pd = useState(""), pending = pd[0], setPending = pd[1];
    var loadedRef = useRef(false);
    function run(intent, text, label) {
      if (sending) return;
      setSending(true); setPending(label || text || "");
      post("/assistant", { intent: intent || "", q: text || "", slug: "", market: "" })
        .then(function (r) { setResult({ label: label || text || "", text: (r && r.ok && r.reply) || (r && r.error) || "(\u65e0\u56de\u590d)" }); })
        .catch(function (x) { setResult({ label: label || text || "", text: "\u51fa\u9519\uff1a" + String(x) }); })
        .finally(function () { setSending(false); setPending(""); });
    }
    function send() { var v = (q || "").trim(); if (v && !sending) { run("", v, v); setQ(""); } }
    // Welcome shown once by default; each click replaces the single result (点哪个加载哪个).
    useEffect(function () {
      if (loadedRef.current) return; loadedRef.current = true;
      run("help", "", "");
    }, []);
    var actions = [["health", L.qHealth], ["recommend", L.qRecommend], ["diagnose", L.qDiagnose],
                   ["audit", L.qAudit], ["about", L.qAbout], ["help", L.qHelp]];
    var resultPane = e("div", { className: "min-h-[88px] rounded-md border border-border bg-muted/20 p-3" },
      sending
        ? e("div", { className: "text-sm text-muted-foreground" }, "\u23f3 " + L.thinking + (pending ? ("\uff1a" + pending) : ""))
        : (result
            ? e("div", null,
                result.label ? e("div", { className: "mb-1 text-xs font-medium text-primary" }, result.label) : null,
                e("div", { className: "text-sm leading-relaxed", dangerouslySetInnerHTML: { __html: mdToHtml(result.text) } }))
            : muted(L.stewardDesc)));
    var butler = e(Card, null, e(CardContent, { className: "space-y-3 p-3" },
      muted(L.stewardDesc, "text-xs"),
      e("div", { className: "flex flex-wrap gap-1.5" }, actions.map(function (a) {
        return e(Button, { key: a[0], size: "sm", variant: "secondary", disabled: sending,
          onClick: function () { run(a[0], "", a[1]); } }, a[1]);
      })),
      e("div", { className: "flex gap-2" },
        e("div", { className: "flex-1" },
          input({ value: q, placeholder: L.promptPh,
            onChange: function (ev) { setQ(ev.target.value); },
            onKeyDown: function (ev) { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); send(); } } })),
        e(Button, { onClick: send, disabled: sending || !q.trim() }, sending ? L.thinking : L.send)),
      resultPane));
    var subs = [["butler", L.stewardBoxTitle], ["learn", L.learnBtn]];
    return e("div", { className: "space-y-4" },
      e(HermesTerminal, null),
      e("div", { className: "space-y-3" },
        e("div", { className: "flex flex-wrap gap-1 border-b border-border pb-2" }, subs.map(function (t) {
          var on = t[0] === sub;
          return e("button", { key: t[0], onClick: function () { setSub(t[0]); },
            className: cn("rounded-md px-3 py-1.5 text-sm transition-colors",
              on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted") }, t[1]);
        })),
        sub === "learn" ? e(Card, null, e(CardContent, { className: "p-3" }, e(Learn, null))) : butler));
  }

  // ============================================================ Favorites
  function Favorites() {
    var L = useL();
    var ds = useState(null), data = ds[0], setData = ds[1];
    function load() { api("/favorites").then(function (d) { setData((d && d.favorites) || []); }).catch(function () { setData([]); }); }
    useEffect(load, []);
    function remove(slug) {
      post("/favorites", { slug: slug, add: false }).then(function (d) { setData((d && d.favorites) || []); }).catch(function () {});
    }
    if (!data) return spin(L.loadFav);
    if (data.length === 0) return muted(L.noFav);
    return e("div", { className: "space-y-2" }, data.map(function (f, i) {
      var slug = (typeof f === "string") ? f : (f.slug || f.name || ("f" + i));
      var meta = (typeof f === "object") ? f : {};
      return e(Card, { key: slug }, e(CardContent, { className: "flex items-center justify-between gap-3 p-3" },
        e("div", { className: "min-w-0" },
          e("div", { className: "truncate text-sm font-medium" }, slug),
          meta.summary || meta.description ? muted(String(meta.summary || meta.description).slice(0, 140), "mt-0.5 line-clamp-2") : null),
        e(Button, { size: "sm", variant: "destructive", onClick: function () { remove(slug); } }, L.removeFav)));
    }));
  }


  // ============================================================ Root
  var TABS = [
    ["search", Search], ["installed", Installed],
    ["converted", Converted], ["favorites", Favorites],
    ["audit", Audit], ["steward", Steward], ["settings", Settings],
  ];
  function tabLabel(L, id) {
    if (id === "steward") return L.tabSteward;
    if (id === "favorites") return L.tabFavorites;
    return L.tabs[id] || id;
  }
  function OmnilimbPanel() {
    var L = useL();
    var ts = useState("search"), tab = ts[0], setTab = ts[1];
    var Active = (TABS.filter(function (t) { return t[0] === tab; })[0] || TABS[0])[1];
    return e("div", { className: "space-y-4" },
      e("div", { className: "flex flex-wrap gap-1 border-b border-border pb-2" },
        TABS.map(function (t) {
          var on = t[0] === tab;
          return e("button", { key: t[0], onClick: function () { setTab(t[0]); },
            className: cn("rounded-md px-3 py-1.5 text-sm transition-colors",
              on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted") },
            tabLabel(L, t[0]));
        })),
      e("div", null, e(Active, null)));
  }

  REG.register("omnilimb", OmnilimbPanel);
})();
