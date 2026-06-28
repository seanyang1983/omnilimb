/* Omnilimb dashboard tab — operations panel (i18n-aware).
 * Plain IIFE using window.__HERMES_PLUGIN_SDK__ (no bundled React).
 * Follows the dashboard's active language via SDK.useI18n().locale.
 */
(function () {
  "use strict";

  var SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK || !SDK.React) return;

  var React = SDK.React;
  var h = React.createElement;
  var useState = SDK.hooks.useState;
  var useEffect = SDK.hooks.useEffect;
  var fetchJSON = SDK.fetchJSON;
  var C = SDK.components || {};
  var API = "/api/plugins/omnilimb";

  // --- i18n --------------------------------------------------------------
  var STRINGS = {
    en: {
      
      
      statusErr: "Status error", loadingStatus: "Loading Omnilimb status…",
      refresh: "Refresh", license: "license", sandbox: "sandbox", workspace: "workspace",
      openclawCli: "openclaw CLI", yes: "yes", no: "no",
      tabSearch: "Search", tabRuntime: "Runtime",
      searchTitle: "Search skills", searchPh: "Search skills — e.g. browser / PPT",
      search: "Search", searching: "Searching…", install: "Install", noResults: "No results.",
      installed: "Installed", installFail: "Install failed",
      runtimeTitle: "Runtime", run: "Run", running: "Running…",
      tabInstalled: "Installed", installedTitle: "Installed skills", noInstalled: "No skills installed yet.",
      installing: "Installing…", health: "OpenClaw health", healthOk: "OpenClaw detected", healthDown: "OpenClaw not found", nativeMode: "native mode — no OpenClaw needed", recheck: "Recheck",
      calls: "Calls", view: "View / Edit", close: "Close", viewDetail: "View", uninstall: "Uninstall", uninstalling: "Uninstalling…", uninstallFail: "Uninstall failed", confirmUninstall: "Uninstall \"%s\"? This permanently deletes the skill from your workspace.", backInstalled: "← Installed", save: "Save", saving: "Saving…", saved: "Saved ✓", saveFail: "Save failed",
      category: "Category", allCategories: "All categories", sortBy: "Sort", sortRelevance: "Relevance", sortDownloads: "Hot", sortStars: "Stars", sortLatest: "Latest", prev: "Prev", next: "Next", page: "Page", downloads: "downloads", stars: "stars", resultsTotal: "results", verifiedBadge: "Verified",
      homepage: "Skill page", deps: "Requires", noDeps: "No extra deps",
      preview: "Preview", edit: "Edit", seats: "seats", tier: "tier",
      runHistory: "Run history", runsTotal: "Total", runsSuccess: "Success", runsAvg: "Avg", runsLast: "Last", noRuns: "No runs recorded yet.", 
      credentials: "API keys / credentials", credSet: "set", credSave: "Save", credClear: "Clear", credAdd: "Add", credKeyPh: "KEY NAME (e.g. OPENAI_API_KEY)", credValuePh: "value (key or URL)", credNone: "This skill declares no API keys, so it needs none. You can still add one manually below if you know it needs one.", credHint: "Credentials the skill itself uses for its external service (unrelated to Hermes's model). Left = key name (the env var the skill needs); right = its value. Example (OpenAI-compatible): OPENAI_API_KEY → your key; add an OPENAI_BASE_URL row → the endpoint URL.",
      envCheck: "Environment check", envBin: "bin", envKey: "key", envBinMissing: "not found on PATH", envKeyMissing: "not set",
      smokeTitle: "Smoke test", smokeRun: "Test run", smokeOk: "ran successfully", smokeExit: "exit code", smokeNeedsArgs: "the script likely needs arguments to run", smokeHint: "Most skills are agent playbooks — their scripts expect arguments, so an empty smoke run can fail even when the skill is fine.", collapse: "Collapse", expand: "Expand", manualTitle: "Skill butler manual", manualClose: "Close",
      scoreTitle: "Skill health check", scoreRun: "Check", scoreAll: "Health-check all", scoreAllRun: "Checking…", alsoSearched: "Related terms also searched", scoreCaps: "Capabilities", recoYes: "Recommended", recoCaution: "Use with caution", recoNo: "Not recommended",
      updateAvail: "Update available",
      toHermes: "\u2192 Hermes", converting: "Converting…", toHermesHint: "Convert this skill into a native Hermes skill",
      tabSettings: "Settings", settingsTitle: "Settings", fieldAudit: "Audit logging", fieldCache: "Local cache", fieldTtl: "Discover cache TTL (s)", needRestart: "some changes apply on restart", diagTitle: "Diagnostics",
      
      workspaceHint: "Where skills are installed. Leave empty to use the default (~/.openclaw/workspace).",
      backendHint: "How skills run. Auto (recommended) picks the best available; CLI routes through the OpenClaw command line (needs OpenClaw installed); Native runs skills with the built-in runtime — no OpenClaw needed.",
      defaultMarket: "Default market", marketHint: "The skill marketplace used by default for search and discovery.",
      auditHint: "Record every tool call to a local audit log you can review in the Audit tab.",
      cacheHint: "Cache discovery and search results locally so repeat loads are instant.",
      ttlHint: "How long discovery results stay cached before a fresh fetch.",
      credSkillTitle: "Installed skill API keys", credSkillPickPh: "Select an installed skill…", credSectionHint: "Pick an installed skill, then add or update the API keys it uses to call its own external service (unrelated to Hermes's model).",
      fieldShowStats: "Top stat cards", showStatsHint: "Show the five summary cards (installed, total calls, updates, favorites, health) at the top of the page.",
      exportSkills: "Export", importSkills: "Import", importDone: "Imported", favorite: "Favorite", recentSearch: "Recent", myFavorites: "My favorites",
      tabFavorites: "Favorites", favEmpty: "No favorites yet. Tap the heart on any skill to save it here.", favRemove: "Remove",
      tabAudit: "Audit", auditTitle: "Audit log", auditDisabled: "Audit logging is off. Enable it in config.yaml: omnilimb.audit_log: true", noAudit: "No audit records yet.", filterTool: "Tool", filterStatus: "Status", statusAll: "All", statusOk: "OK only", statusFail: "Failed only", export: "Export", time: "Time",
      cachedNotice: "Upstream unavailable — showing cached results (may be stale)",
      heroKicker: "OPENCLAW SKILL MARKETPLACE · AGENT-DRIVEN SUBSTRATE", heroSubtitle: "Let the Hermes brain drive the entire OpenClaw skill ecosystem — community skills, sandboxes, browsers and multi-language runtimes unified as deterministic structured-JSON tools the agent calls directly. No second AI loop, zero inference overhead — find it, install it, run it.", refreshAll: "Refresh", statBackend: "Backend", statMarket: "Market", statInstalled: "Installed", statHealth: "Health", healthyShort: "Healthy", attentionShort: "Attention", statSuccess: "Success rate", statMarkets: "Markets", statCalls: "calls", noRunsShort: "no runs yet", statCallsTotal: "Total calls", statUpdates: "Updates",
      from: "from", catAll: "All",
      secHot: "🔥 Hot picks", secLatest: "🆕 Newest", secTop: "⭐ Top rated", viewMore: "View more →", backDiscover: "← Discover",
      discReco: "For you", discRising: "Trending", discHot: "Top downloads", discNewest: "Newest",
      cachedHint: "cached",
    },
    zh: {
      
      
      statusErr: "状态错误", loadingStatus: "正在加载 Omnilimb 状态…",
      refresh: "刷新", license: "授权", sandbox: "沙箱", workspace: "工作区",
      openclawCli: "openclaw CLI", yes: "是", no: "否",
      tabSearch: "搜索", tabRuntime: "运行时",
      searchTitle: "搜索技能", searchPh: "搜索技能，例如 浏览器 / PPT",
      search: "搜索", searching: "搜索中…", install: "安装", noResults: "无结果。",
      installed: "已安装", installFail: "安装失败",
      runtimeTitle: "运行时", run: "运行", running: "运行中…",
      tabInstalled: "已安装", installedTitle: "已安装技能", noInstalled: "尚未安装任何技能。",
      installing: "安装中…", health: "OpenClaw 状态", healthOk: "已检测到 OpenClaw", healthDown: "未检测到 OpenClaw", nativeMode: "原生模式 — 无需 OpenClaw", recheck: "重新检测",
      calls: "调用", view: "查看 / 编辑", close: "收起", viewDetail: "查看详情", uninstall: "卸载", uninstalling: "卸载中…", uninstallFail: "卸载失败", confirmUninstall: "确定卸载「%s」？这会从工作区永久删除该技能。", backInstalled: "← 返回已安装", save: "保存", saving: "保存中…", saved: "已保存 ✓", saveFail: "保存失败",
      category: "分类", allCategories: "全部分类", sortBy: "排序", sortRelevance: "相关度", sortDownloads: "热度", sortStars: "星标", sortLatest: "最新", prev: "上一页", next: "下一页", page: "第", downloads: "下载", stars: "星", resultsTotal: "个结果", verifiedBadge: "已验证",
      homepage: "技能页面", deps: "依赖", noDeps: "无额外依赖",
      preview: "预览", edit: "编辑", seats: "席位", tier: "档位",
      runHistory: "运行记录", runsTotal: "总调用", runsSuccess: "成功率", runsAvg: "平均耗时", runsLast: "最近", noRuns: "暂无运行记录。", 
      credentials: "API Key / 凭据", credSet: "已设置", credSave: "保存", credClear: "清除", credAdd: "添加", credKeyPh: "键名（如 OPENAI_API_KEY）", credValuePh: "值（密钥或地址）", credNone: "该技能没有声明需要 API Key，因此无需填写。若你确定它需要某个密钥，可在下方手动添加。", credHint: "这是技能自己调外部服务用的密钥（和 Hermes 用哪个模型无关）。左边「键名」填技能要的环境变量名，右边填它的值。例（OpenAI 兼容模式）：键名 OPENAI_API_KEY、值填你的密钥；再加一行键名 OPENAI_BASE_URL、值填接口地址。",
      envCheck: "环境检查", envBin: "命令", envKey: "密钥", envBinMissing: "PATH 中未找到", envKeyMissing: "未设置",
      smokeTitle: "冒烟测试", smokeRun: "试运行", smokeOk: "运行成功", smokeExit: "退出码", smokeNeedsArgs: "该脚本可能需要参数才能运行", smokeHint: "多数技能是给 Agent 用的「操作手册」——脚本需要带参数运行，所以空参数冒烟即使技能正常也可能失败。", collapse: "收起", expand: "展开", manualTitle: "技能管家说明书", manualClose: "关闭",
      scoreTitle: "技能体检", scoreRun: "体检", scoreAll: "全部体检", scoreAllRun: "体检中…", alsoSearched: "已自动包含相关词的搜索结果", scoreCaps: "能力", recoYes: "推荐安装/使用", recoCaution: "谨慎", recoNo: "不推荐",
      updateAvail: "有可用更新",
      toHermes: "\u2192 Hermes", converting: "转换中…", toHermesHint: "把这个技能转换成原生 Hermes 技能",
      tabSettings: "设置", settingsTitle: "设置", fieldAudit: "审计日志记录", fieldCache: "本地缓存", fieldTtl: "发现页缓存有效期(秒)", needRestart: "部分改动重启后生效", diagTitle: "诊断",
      
      workspaceHint: "技能的安装目录；留空使用默认（~/.openclaw/workspace）。",
      backendHint: "技能怎么运行。auto（推荐）自动选最合适的；cli 通过 OpenClaw 命令行运行（需已安装 OpenClaw）；native 用内置运行时直接跑，无需 OpenClaw。",
      defaultMarket: "默认市场", marketHint: "搜索和发现页默认使用的技能市场。",
      auditHint: "把每次工具调用记录到本地审计日志，可在「审计」标签里查看。",
      cacheHint: "在本地缓存发现和搜索结果，重复打开更快。",
      ttlHint: "发现页结果缓存多久后才重新拉取。",
      credSkillTitle: "已安装技能的 API Key", credSkillPickPh: "选择一个已安装的技能…", credSectionHint: "选择一个已安装技能，为它添加或更新调用自身外部服务所需的 API Key（与 Hermes 用哪个模型无关）。",
      fieldShowStats: "顶部统计卡", showStatsHint: "在页面顶部显示五个概览方块（已安装、累计调用、可更新、收藏、健康）。",
      exportSkills: "导出", importSkills: "导入", importDone: "已导入", favorite: "收藏", recentSearch: "最近搜索", myFavorites: "我的收藏",
      tabFavorites: "收藏", favEmpty: "还没有收藏。点任意技能上的红心即可收藏到这里。", favRemove: "移除",
      tabAudit: "审计", auditTitle: "审计日志", auditDisabled: "审计未开启。在 config.yaml 中启用：omnilimb.audit_log: true", noAudit: "暂无审计记录。", filterTool: "工具", filterStatus: "状态", statusAll: "全部", statusOk: "仅成功", statusFail: "仅失败", export: "导出", time: "时间",
      cachedNotice: "上游不可达 — 显示缓存结果（可能已过期）",
      heroKicker: "OPENCLAW 技能市场 · 智能体直驱底座", heroSubtitle: "让 Hermes 的大脑直接驱动整个 OpenClaw 技能生态 —— 社区技能、沙箱、浏览器与多语言运行时统一成确定性的结构化 JSON 工具,由智能体直接调用;不额外跑一层 AI、零推理消耗,找到即装、装完即跑。", refreshAll: "刷新", statBackend: "后端", statMarket: "市场", statInstalled: "已安装", statHealth: "健康", healthyShort: "正常", attentionShort: "需关注", statSuccess: "运行成功率", statMarkets: "可用市场", statCalls: "次调用", noRunsShort: "暂无运行", statCallsTotal: "累计调用", statUpdates: "可更新",
      from: "源自", catAll: "全部",
      secHot: "🔥 热门推荐", secLatest: "🆕 最新上架", secTop: "⭐ 高分精选", viewMore: "查看更多 →", backDiscover: "← 返回发现",
      discReco: "为你推荐", discRising: "近期飙升", discHot: "下载热榜", discNewest: "最近上新",
      cachedHint: "已缓存",
    },
    "zh-hant": {
      
      
      statusErr: "狀態錯誤", loadingStatus: "正在載入 Omnilimb 狀態…",
      refresh: "重新整理", license: "授權", sandbox: "沙箱", workspace: "工作區",
      openclawCli: "openclaw CLI", yes: "是", no: "否",
      tabSearch: "搜尋", tabRuntime: "執行階段",
      searchTitle: "搜尋技能", searchPh: "搜尋技能，例如 github / 地圖",
      search: "搜尋", searching: "搜尋中…", install: "安裝", noResults: "無結果。",
      installed: "已安裝", installFail: "安裝失敗",
      
      
      runtimeTitle: "執行階段", run: "執行", running: "執行中…",
      tabInstalled: "已安裝", installedTitle: "已安裝技能", noInstalled: "尚未安裝任何技能。",
      installing: "安裝中…", health: "OpenClaw 狀態", healthOk: "已偵測到 OpenClaw", healthDown: "未偵測到 OpenClaw", nativeMode: "原生模式 — 無需 OpenClaw", recheck: "重新偵測",
    },
    ja: {
      
      
      statusErr: "ステータスエラー", loadingStatus: "Omnilimb のステータスを読み込み中…",
      refresh: "更新", license: "ライセンス", sandbox: "サンドボックス", workspace: "ワークスペース",
      openclawCli: "openclaw CLI", yes: "はい", no: "いいえ",
      tabSearch: "検索", tabRuntime: "ランタイム",
      searchTitle: "スキル検索", searchPh: "スキルを検索 — 例: github / 地図",
      search: "検索", searching: "検索中…", install: "インストール", noResults: "結果なし。",
      installed: "インストール済み", installFail: "インストール失敗",
      
      
      runtimeTitle: "ランタイム", run: "実行", running: "実行中…",
      tabInstalled: "インストール済み", installedTitle: "インストール済みスキル", noInstalled: "まだスキルがありません。",
      installing: "インストール中…", health: "OpenClaw 状態", healthOk: "OpenClaw を検出", healthDown: "OpenClaw が見つかりません", nativeMode: "ネイティブモード — OpenClaw 不要", recheck: "再確認",
    },
    ko: {
      
      
      statusErr: "상태 오류", loadingStatus: "Omnilimb 상태 로딩 중…",
      refresh: "새로고침", license: "라이선스", sandbox: "샌드박스", workspace: "작업공간",
      openclawCli: "openclaw CLI", yes: "예", no: "아니오",
      tabSearch: "검색", tabRuntime: "런타임",
      searchTitle: "스킬 검색", searchPh: "스킬 검색 — 예: github / 지도",
      search: "검색", searching: "검색 중…", install: "설치", noResults: "결과 없음.",
      installed: "설치됨", installFail: "설치 실패",
      
      
      runtimeTitle: "런타임", run: "실행", running: "실행 중…",
      tabInstalled: "설치됨", installedTitle: "설치된 스킬", noInstalled: "아직 설치된 스킬이 없습니다.",
      installing: "설치 중…", health: "OpenClaw 상태", healthOk: "OpenClaw 감지됨", healthDown: "OpenClaw 없음", nativeMode: "네이티브 모드 — OpenClaw 불필요", recheck: "다시 확인",
    },
    de: {
      
      
      statusErr: "Statusfehler", loadingStatus: "Omnilimb-Status wird geladen…",
      refresh: "Aktualisieren", license: "Lizenz", sandbox: "Sandbox", workspace: "Arbeitsbereich",
      openclawCli: "openclaw CLI", yes: "ja", no: "nein",
      tabSearch: "Suche", tabRuntime: "Laufzeit",
      searchTitle: "Skills suchen", searchPh: "Skills suchen – z. B. github / Karte",
      search: "Suchen", searching: "Suche läuft…", install: "Installieren", noResults: "Keine Ergebnisse.",
      installed: "Installiert", installFail: "Installation fehlgeschlagen",
      
      
      runtimeTitle: "Laufzeit", run: "Ausführen", running: "Läuft…",
      tabInstalled: "Installiert", installedTitle: "Installierte Skills", noInstalled: "Noch keine Skills installiert.",
      installing: "Installiere…", health: "OpenClaw-Status", healthOk: "OpenClaw erkannt", healthDown: "OpenClaw nicht gefunden", nativeMode: "Native Modus — kein OpenClaw nötig", recheck: "Erneut prüfen",
    },
    es: {
      
      
      statusErr: "Error de estado", loadingStatus: "Cargando estado de Omnilimb…",
      refresh: "Actualizar", license: "licencia", sandbox: "sandbox", workspace: "espacio",
      openclawCli: "openclaw CLI", yes: "sí", no: "no",
      tabSearch: "Buscar", tabRuntime: "Runtime",
      searchTitle: "Buscar skills", searchPh: "Buscar skills — p. ej. github / mapa",
      search: "Buscar", searching: "Buscando…", install: "Instalar", noResults: "Sin resultados.",
      installed: "Instalado", installFail: "Error de instalación",
      
      
      runtimeTitle: "Runtime", run: "Ejecutar", running: "Ejecutando…",
      tabInstalled: "Instalados", installedTitle: "Skills instalados", noInstalled: "Aún no hay skills instalados.",
      installing: "Instalando…", health: "Estado de OpenClaw", healthOk: "OpenClaw detectado", healthDown: "OpenClaw no encontrado", nativeMode: "modo nativo — sin OpenClaw", recheck: "Reverificar",
    },
    fr: {
      
      
      statusErr: "Erreur d'état", loadingStatus: "Chargement de l'état Omnilimb…",
      refresh: "Actualiser", license: "licence", sandbox: "sandbox", workspace: "espace",
      openclawCli: "openclaw CLI", yes: "oui", no: "non",
      tabSearch: "Recherche", tabRuntime: "Runtime",
      searchTitle: "Rechercher des skills", searchPh: "Rechercher des skills — ex. github / carte",
      search: "Rechercher", searching: "Recherche…", install: "Installer", noResults: "Aucun résultat.",
      installed: "Installé", installFail: "Échec de l'installation",
      
      
      runtimeTitle: "Runtime", run: "Exécuter", running: "Exécution…",
      tabInstalled: "Installés", installedTitle: "Skills installés", noInstalled: "Aucun skill installé pour l'instant.",
      installing: "Installation…", health: "État d'OpenClaw", healthOk: "OpenClaw détecté", healthDown: "OpenClaw introuvable", nativeMode: "mode natif — OpenClaw non requis", recheck: "Revérifier",
    },
    ru: {
      
      
      statusErr: "Ошибка статуса", loadingStatus: "Загрузка статуса Omnilimb…",
      refresh: "Обновить", license: "лицензия", sandbox: "песочница", workspace: "рабочая область",
      openclawCli: "openclaw CLI", yes: "да", no: "нет",
      tabSearch: "Поиск", tabRuntime: "Среда",
      searchTitle: "Поиск навыков", searchPh: "Поиск навыков — напр. github / карта",
      search: "Искать", searching: "Поиск…", install: "Установить", noResults: "Нет результатов.",
      installed: "Установлено", installFail: "Ошибка установки",
      
      
      runtimeTitle: "Среда", run: "Запустить", running: "Выполнение…",
      tabInstalled: "Установлено", installedTitle: "Установленные навыки", noInstalled: "Навыки ещё не установлены.",
      installing: "Установка…", health: "Состояние OpenClaw", healthOk: "OpenClaw обнаружен", healthDown: "OpenClaw не найден", nativeMode: "нативный режим — OpenClaw не нужен", recheck: "Проверить снова",
    },
    pt: {
      
      
      statusErr: "Erro de estado", loadingStatus: "Carregando estado do Omnilimb…",
      refresh: "Atualizar", license: "licença", sandbox: "sandbox", workspace: "workspace",
      openclawCli: "openclaw CLI", yes: "sim", no: "não",
      tabSearch: "Buscar", tabRuntime: "Runtime",
      searchTitle: "Buscar skills", searchPh: "Buscar skills — ex. github / mapa",
      search: "Buscar", searching: "Buscando…", install: "Instalar", noResults: "Sem resultados.",
      installed: "Instalado", installFail: "Falha na instalação",
      
      
      runtimeTitle: "Runtime", run: "Executar", running: "Executando…",
      tabInstalled: "Instalados", installedTitle: "Skills instalados", noInstalled: "Nenhum skill instalado ainda.",
      installing: "Instalando…", health: "Estado do OpenClaw", healthOk: "OpenClaw detectado", healthDown: "OpenClaw não encontrado", nativeMode: "modo nativo — sem OpenClaw", recheck: "Reverificar",
    },
  };

  function useTr() {
    var i18n = SDK.useI18n ? SDK.useI18n() : null;
    var loc = (i18n && i18n.locale) || "en";
    var table = STRINGS[loc] || STRINGS.en;
    return function (k) {
      return table[k] != null ? table[k] : (STRINGS.en[k] != null ? STRINGS.en[k] : k);
    };
  }

  // --- component fallbacks -----------------------------------------------
  function box(tag, extraClass) {
    return function (props, children) {
      props = props || {};
      var cls = (props.className ? props.className + " " : "") + (extraClass || "");
      return h(tag, Object.assign({}, props, { className: cls }), children);
    };
  }
  var Card = C.Card || box("div", "rounded-lg border bg-card text-card-foreground p-4");
  var CardHeader = C.CardHeader || box("div", "mb-2");
  var CardTitle = C.CardTitle || box("div", "font-semibold");
  var CardContent = C.CardContent || box("div", "");
  var Badge = C.Badge || box("span", "inline-flex items-center rounded border px-1.5 py-0.5 text-xs");
  var Button = C.Button || box("button", "inline-flex items-center rounded border px-3 py-1.5 text-sm hover:bg-accent");

  function api(path, init) { return fetchJSON(API + path, init); }
  function post(path, body) {
    return api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  }

  // ==== 1.0 feature shims (Converted / Learn / Steward) — added on top of the
  // restored 0.80 panel so search/home keep the original UI while the new 1.0
  // tabs are available. These helpers are namespaced to avoid clobbering the
  // 0.80 panel's own rendering. =========================================
  var e = h;
  var Separator = C.Separator || box("hr", "my-2 border-border");
  var useRef = (SDK.hooks && SDK.hooks.useRef) || React.useRef;
  var useCallback = (SDK.hooks && SDK.hooks.useCallback) || React.useCallback;
  var cn = (SDK.utils && SDK.utils.cn) || function () { return Array.prototype.filter.call(arguments, Boolean).join(" "); };
  function muted(txt, cls) { return e("p", { className: cn("text-sm text-muted-foreground", cls) }, txt); }
  function errBox(msg) { return e("div", { className: "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" }, String(msg)); }
  function spin(txt) { return muted(txt + "..."); }
  function input(props) { return e("input", Object.assign({ className: "w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" }, props)); }
  function textarea(props) { return e("textarea", Object.assign({ className: "w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring" }, props)); }
  function select(value, onChange, options, extra) {
    return e("select", Object.assign({ value: value, onChange: onChange, className: "rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring" }, extra || {}),
      (options || []).map(function (o) { var val = o.value !== undefined ? o.value : o; var lab = o.label !== undefined ? o.label : o; return e("option", { key: String(val), value: val }, lab); }));
  }
  var XSTR = {
    en: {
      tabConverted: "Converted", tabSteward: "Skill butler",
      confirmRemove: "Remove this converted skill?", loadConverted: "loading converted",
      noConverted: "No converted skills yet. Convert one from Installed, or use Learn.", remove: "Remove",
      learnDesc: "Distill a native Hermes skill from any source — a local path, a URL, or pasted text. The open-ended /learn equivalent.",
      autoDetect: "auto-detect", typePath: "path", typeUrl: "url", typeText: "text",
      modeAi: "ai_curated (model)", modeDet: "deterministic (offline)",
      namePh: "skill name (optional)", srcPh: "Path / URL, or paste the material to learn from...",
      learnBtn: "Learn skill", learning: "Learning...", learnFail: "learn failed",
      fellBack: "(model unavailable — used deterministic draft)",
      stewardDesc: "A deterministic skill butler (no LLM). Ask it to health-check, recommend, diagnose, or scan the audit log — or type a command.",
      qHealth: "Health-check", qRecommend: "Recommend", qDiagnose: "Diagnose", qAudit: "Scan audit", qAbout: "About", qHelp: "Help",
      promptPh: "Type a command or question (e.g. recommend github)...", send: "Send", thinking: "Thinking...",
      stewardBoxTitle: "Skill butler", connectHermes: "Connect Hermes",
      connectHint: "A live Hermes agent terminal, right here. Click Connect to start a real session over the dashboard PTY.",
      termConnect: "Connect", termDisconnect: "Disconnect", termConnecting: "connecting", termOpen: "connected", termClosed: "disconnected", termErr: "error",
      termUnavail: "Terminal failed to load — try refreshing the page.",
    },
    zh: {
      tabConverted: "已转换", tabSteward: "技能管家",
      confirmRemove: "移除这个已转换技能？", loadConverted: "加载已转换",
      noConverted: "还没有已转换技能。从「已安装」转换一个，或用「学习技能」。", remove: "移除",
      learnDesc: "从任意来源蒸馏出一个原生 Hermes 技能 —— 本地路径、URL 或粘贴文本。开放进料版的 /learn。",
      autoDetect: "自动识别", typePath: "路径", typeUrl: "网址", typeText: "文本",
      modeAi: "ai_curated（用模型）", modeDet: "deterministic（离线）",
      namePh: "技能名（可选）", srcPh: "路径 / 网址，或粘贴要学习的材料...",
      learnBtn: "学习技能", learning: "学习中...", learnFail: "学习失败",
      fellBack: "（模型不可用 —— 已用离线草稿）",
      stewardDesc: "一个确定性的技能管家（不调大模型）。让它做体检、推荐、诊断、扫审计——或直接打命令。",
      qHealth: "体检", qRecommend: "推荐", qDiagnose: "诊断", qAudit: "扫审计", qAbout: "关于", qHelp: "帮助",
      promptPh: "输入指令或问题（如：推荐 github）...", send: "发送", thinking: "处理中...",
      stewardBoxTitle: "技能管家", connectHermes: "接入 Hermes",
      connectHint: "就在这里直接接入一个实时的 Hermes 智能体终端。点「连接」即通过仪表盘 PTY 开启真实会话。",
      termConnect: "连接", termDisconnect: "断开", termConnecting: "连接中", termOpen: "已连接", termClosed: "已断开", termErr: "出错",
      termUnavail: "终端加载失败 —— 刷新页面再试。",
    },
  };
  function useL() {
    var i18n = SDK.useI18n ? SDK.useI18n() : null;
    var loc = (i18n && i18n.locale) || "en";
    return (loc.indexOf("zh") === 0) ? XSTR.zh : (XSTR[loc] || XSTR.en);
  }

  // Discover boards persisted to localStorage per market, so a repeat page open
  // renders instantly from disk (0 network, 0 flash); a silent background refresh
  // then updates the data. Survives dashboard cold starts too.
  var EX_DISC_LS = "omnilimb.discover.v2";
  function exLsAll() { try { return JSON.parse(localStorage.getItem(EX_DISC_LS) || "{}") || {}; } catch (e) { return {}; } }
  function exLsSeed(mk) { var e = exLsAll()[mk]; return (e && e.tabs && typeof e.tabs === "object") ? e.tabs : {}; }
  function exLsSave(mk, tabs) { try { var all = exLsAll(); all[mk] = { ts: Date.now(), tabs: tabs }; localStorage.setItem(EX_DISC_LS, JSON.stringify(all)); } catch (e) { } }
  // Markets: seed the dropdown from the built-in set (and last-seen cache) so the
  // first paint already shows the full list — no "2 then 4" flicker while /markets loads.
  var EX_MARKETS_LS = "omnilimb.markets.v1";
  var EX_BUILTIN_MARKETS = [
    { id: "clawhub", label: "ClawHub · 官方" },
    { id: "clawhub-cn", label: "ClawHub 国内镜像" },
    { id: "skillhub", label: "SkillHub.cn · 腾讯" },
    { id: "skillsmp", label: "SkillsMP · GitHub 技能索引" },
  ];
  function exMarketsSeed() {
    try { var c = JSON.parse(localStorage.getItem(EX_MARKETS_LS) || "null"); if (c && c.length) return c; } catch (e) { }
    return EX_BUILTIN_MARKETS;
  }
  function exMarketsSave(list) { try { if (list && list.length) localStorage.setItem(EX_MARKETS_LS, JSON.stringify(list)); } catch (e) { } }
  // Top stat-card visibility preference (UI-only, default shown). TopBar listens
  // for the custom event so a Settings toggle reflects instantly without reload.
  var EX_SHOWSTATS_LS = "omnilimb.showStats.v1";
  function exShowStats() { try { return localStorage.getItem(EX_SHOWSTATS_LS) !== "0"; } catch (e) { return true; } }
  function exSetShowStats(v) {
    try { localStorage.setItem(EX_SHOWSTATS_LS, v ? "1" : "0"); } catch (e) { }
    try { window.dispatchEvent(new CustomEvent("omnilimb:showstats", { detail: !!v })); } catch (e) { }
  }
  function field(props) {
    return h("input", Object.assign({ className: "w-full rounded border bg-transparent px-2 py-1.5 text-sm" }, props));
  }
  // Colorable link/chain icon (inherits currentColor — recolor via CSS, no emoji).
  function linkIcon() {
    return h("svg", { viewBox: "0 0 24 24", width: "15", height: "15", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" },
      h("path", { key: "a", d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
      h("path", { key: "b", d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }));
  }
  function pre(text) {
    return h("pre", { className: "mt-2 max-h-72 overflow-auto rounded border bg-muted/40 p-2 text-xs whitespace-pre-wrap" }, text);
  }
  // Fixed grade colors applied INLINE. Inverted "lens" themes (e.g. Nous Blue)
  // flip the whole page via a z-200 mix-blend-mode:difference overlay, which would
  // turn our blue into gold and white text into black. We counter that by
  // pre-inverting EXACTLY when the lens is active: --foreground-alpha is 1 on
  // inverted themes and 0 on normal dark themes, so invert(var(--foreground-alpha))
  // is identity normally and a full invert under the lens (which the lens then
  // flips back) → the grade colors look identical in every theme.
  var EX_GRADE_HEX = { A: "#22c55e", B: "#3b82f6", C: "#f59e0b", D: "#ef4444" };
  function gradeStyle(g) { return { background: EX_GRADE_HEX[g] || "#6b7280", color: "#fff", filter: "invert(var(--foreground-alpha, 0))" }; }
  function row(children) { return h("div", { className: "flex flex-wrap items-center gap-2" }, children); }

  // --- minimal, XSS-safe Markdown renderer (no external deps) ------------
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function mdInline(s) {
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // links [text](url) — only http(s) hrefs survive (everything else is escaped text)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }
  function mdToHtml(src) {
    if (!src) return "";
    var lines = escapeHtml(src).split(/\r?\n/);
    var out = []; var inCode = false; var codeBuf = []; var listBuf = null;
    function flushList() { if (listBuf) { out.push("<ul>" + listBuf.join("") + "</ul>"); listBuf = null; } }
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (ln.trim().indexOf("```") === 0) {
        if (inCode) { out.push("<pre><code>" + codeBuf.join("\n") + "</code></pre>"); codeBuf = []; inCode = false; }
        else { flushList(); inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(ln); continue; }
      var hm = ln.match(/^(#{1,6})\s+(.*)$/);
      if (hm) { flushList(); var lvl = hm[1].length; out.push("<h" + lvl + ">" + mdInline(hm[2]) + "</h" + lvl + ">"); continue; }
      var li = ln.match(/^\s*[-*]\s+(.*)$/);
      if (li) { if (!listBuf) listBuf = []; listBuf.push("<li>" + mdInline(li[1]) + "</li>"); continue; }
      if (ln.trim() === "") { flushList(); continue; }
      flushList(); out.push("<p>" + mdInline(ln) + "</p>");
    }
    if (inCode) out.push("<pre><code>" + codeBuf.join("\n") + "</code></pre>");
    flushList();
    return out.join("\n");
  }
  function isMarkdown(path) { return /\.(md|markdown)$/i.test(path || ""); }

  var CAT_LABELS = {
    "developer-tools": { zh: "开发工具", en: "Developer Tools" },
    "ai-intelligence": { zh: "AI 智能", en: "AI" },
    "security-compliance": { zh: "安全合规", en: "Security" },
    "productivity": { zh: "效率提升", en: "Productivity" },
    "data-analysis": { zh: "数据分析", en: "Data" },
    "data": { zh: "数据分析", en: "Data" },
    "content-creation": { zh: "内容创作", en: "Content" },
    "content": { zh: "内容创作", en: "Content" },
    "communication": { zh: "通讯协作", en: "Communication" },
    "automation": { zh: "自动化", en: "Automation" },
    "research": { zh: "研究检索", en: "Research" },
    "devops": { zh: "运维部署", en: "DevOps" },
    "finance": { zh: "金融财务", en: "Finance" },
    "marketing": { zh: "市场营销", en: "Marketing" },
    "design": { zh: "设计创意", en: "Design" },
    "education": { zh: "教育学习", en: "Education" },
    "writing": { zh: "写作", en: "Writing" },
    "media": { zh: "多媒体", en: "Media" },
  };
  function prettySlug(s) { return String(s || "").replace(/[-_]+/g, " ").replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function catLabel(slug, locale) { var m = CAT_LABELS[slug]; if (!m) return prettySlug(slug); return (locale && locale.indexOf("zh") === 0) ? m.zh : m.en; }
  function srcLabel(src, market) {
    var s = String(src || "").toLowerCase();
    if (s === "clawhub") return "ClawHub";
    if (s === "skillhub") return "SkillHub";
    if (s) return src;
    return market === "skillhub" ? "SkillHub" : "ClawHub";
  }

  function skelCard(i) {
    return h("div", { key: i, className: "ex-skel-card" },
      h("div", { className: "ex-skel-row" },
        h("div", { className: "ex-skel ex-skel-icon" }),
        h("div", { style: { flex: 1 } }, h("div", { className: "ex-skel ex-skel-title" }))),
      h("div", { className: "ex-skel ex-skel-line" }),
      h("div", { className: "ex-skel ex-skel-line short" }),
      h("div", { className: "ex-skel-row" },
        h("div", { className: "ex-skel ex-skel-pill" }),
        h("div", { className: "ex-skel ex-skel-pill" })));
  }
  function skelGrid(n) {
    var arr = []; for (var i = 0; i < (n || 6); i++) arr.push(skelCard(i));
    return h("div", { className: "ex-grid" }, arr);
  }
  function skelStats() {
    var arr = [];
    for (var i = 0; i < 5; i++) {
      arr.push(h("div", { key: i, className: "ex-stat" },
        h("div", { className: "ex-skel", style: { height: ".6rem", width: "50%" } }),
        h("div", { className: "ex-skel", style: { height: "1.15rem", width: "72%", marginTop: ".45rem" } })));
    }
    return h("section", { className: "ex-stats" }, arr);
  }

  function StatCard(props) {
    return h("div", { className: "ex-stat" },
      h("div", { className: "ex-stat-label" }, props.label),
      h("div", { className: "ex-stat-value " + (props.cls || "") }, props.value),
      props.hint ? h("div", { className: "ex-stat-hint" }, props.hint) : null);
  }

  function TopBar() {
    var t = useTr();
    var st = useState(null);
    var hp = useState(null);
    var inst = useState(null);
    var upd = useState(null);
    var favs = useState(null);
    var showStats = useState(exShowStats());
    function load() {
      api("/status").then(st[1]).catch(function (e) { st[1]({ ok: false, error: String(e) }); });
      hp[1](null);
      api("/health").then(hp[1]).catch(function (e) { hp[1]({ ok: false, error: String(e) }); });
      api("/installed").then(inst[1]).catch(function () { inst[1](null); });
      api("/skill_updates").then(upd[1]).catch(function () { upd[1](null); });
      api("/favorites").then(favs[1]).catch(function () { favs[1](null); });
    }
    useEffect(function () {
      load();
      var on = function () { showStats[1](exShowStats()); };
      window.addEventListener("omnilimb:showstats", on);
      return function () { window.removeEventListener("omnilimb:showstats", on); };
    }, []);
    var s = st[0]; var hv = hp[0]; var iv = inst[0];

    var hero = h("section", { className: "ex-hero" },
      h("div", { className: "ex-hero-text" },
        h("div", { className: "ex-kicker" }, t("heroKicker")),
        h("h1", null, "Omnilimb" + (s && s.ok && s.version ? "  v" + s.version : "")),
        h("p", null, t("heroSubtitle"))),
      h("div", { className: "ex-hero-actions" },
        h("button", { className: "ex-btn ex-btn-primary", onClick: load }, t("refreshAll"))));

    if (!s) return h("div", null, hero);
    if (!s.ok) return h("div", null, hero, h("div", { className: "ex-section" }, h("span", { className: "ex-bad" }, t("statusErr") + ": " + (s.error || "?"))));

    var healthVal, healthCls, ocHint;
    if (!hv) { healthVal = "…"; healthCls = ""; ocHint = ""; }
    else if (hv.ok === false) { healthVal = t("attentionShort"); healthCls = "ex-bad"; ocHint = hv.error || ""; }
    else {
      healthVal = hv.healthy ? t("healthyShort") : t("attentionShort");
      healthCls = hv.healthy ? "ex-ok" : "ex-warn";
      ocHint = hv.openclaw_installed ? (t("healthOk") + (hv.openclaw_version ? " · " + hv.openclaw_version : "")) : t("nativeMode");
    }
    var instCount = (iv && iv.skills) ? iv.skills.length : ((iv && iv.count) || 0);
    var callsTotal = (s.runs && s.runs.total) || 0;
    var upv = upd[0];
    var updCount = (upv && upv.updates) ? Object.keys(upv.updates).filter(function (k) { return upv.updates[k] && upv.updates[k].update_available; }).length : 0;
    var fvv = favs[0];
    var favCount = (fvv && fvv.favorites) ? fvv.favorites.length : 0;

    var stats = h("section", { className: "ex-stats" },
      h(StatCard, { key: "i", label: t("statInstalled"), value: String(instCount), cls: "" }),
      h(StatCard, { key: "c", label: t("statCallsTotal"), value: String(callsTotal), cls: "" }),
      h(StatCard, { key: "u", label: t("statUpdates"), value: String(updCount), cls: updCount > 0 ? "ex-warn" : "" }),
      h(StatCard, { key: "f", label: t("favorite"), value: String(favCount), cls: "" }),
      h(StatCard, { key: "h", label: t("statHealth"), value: healthVal, hint: ocHint, cls: healthCls }));
    return h("div", { className: "ex-page" }, hero, showStats[0] ? stats : null);
  }

  function SearchPanel(props) {
    var t = useTr();
    var loc = (SDK.useI18n ? (SDK.useI18n().locale || "en") : "en");
    var q = useState(""); var market = useState("clawhub");
    var category = useState(""); var sort = useState("downloads");
    var page = useState(1);
    var res = useState(null); var loading = useState(false);
    var cats = useState([]);
    var inst = useState({});
    var view = useState("discover");      // "discover" | "results"
    var layout = useState("grid");        // "grid" | "list"
    var disc = useState(exLsSeed("clawhub"));   // seed from localStorage → instant first paint
    var discTab = useState("recommended");
    var discLoading = useState({});       // tab -> bool (per-tab loading)
    var favs = useState([]);              // K: favorite slugs
    var history = useState([]);           // K: recent searches
    var markets = useState(exMarketsSeed());   // seeded with builtin/cached set (no flicker)
    var PAGE = 30;

    function setInst(slug, val) { var cur = Object.assign({}, inst[0]); cur[slug] = val; inst[1](cur); }
    function fmtNum(n) {
      if (n == null) return null;
      n = Number(n); if (isNaN(n)) return null;
      if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
      if (n >= 1000) return (n / 1000).toFixed(1) + "k";
      return String(n);
    }
    function loadCats(mk) {
      cats[1]([]);
      api("/categories?market=" + mk).then(function (r) { cats[1]((r && r.categories) || []); }).catch(function () { cats[1]([]); });
    }
    function fetchList(opts, cb) {
      var mk = opts.market != null ? opts.market : market[0];
      var cat = opts.category != null ? opts.category : "";
      var so = opts.sort != null ? opts.sort : sort[0];
      var kw = opts.q != null ? opts.q : "";
      var lim = opts.limit || PAGE;
      var pg = opts.page || 1;
      var url = "/search?q=" + encodeURIComponent(kw) + "&market=" + mk + "&limit=" + lim
        + "&page=" + pg + "&sort=" + so + (cat ? "&category=" + encodeURIComponent(cat) : "")
        + (kw ? "" : "&browse=true");
      api(url).then(cb).catch(function (e) { cb({ ok: false, error: String(e) }); });
    }
    var DISC_SORT = { recommended: "relevance", rising: "stars", hot: "downloads", newest: "latest" };
    // Per-tab client cache. Concurrent prefetches use functional state updates so
    // parallel responses don't clobber each other.
    function setDiscTab(tab, r) {
      disc[1](function (prev) {
        var c = Object.assign({}, prev); c[tab] = r;
        if (r && r.ok) exLsSave(market[0], c);   // persist fresh boards for instant repeat open
        return c;
      });
    }
    function setLoad(tab, v) { discLoading[1](function (prev) { var c = Object.assign({}, prev); c[tab] = v; return c; }); }
    function fetchTab(mk, tab, force) {
      setLoad(tab, true);
      return api("/discover?market=" + mk + "&tab=" + tab + (force ? "&force=true" : ""))
        .then(function (r) { setDiscTab(tab, r); })
        .catch(function (e) { setDiscTab(tab, { ok: false, error: String(e) }); })
        .finally(function () { setLoad(tab, false); });
    }
    // Open instantly: load "recommended" first, then prefetch the rest in the
    // background so tab switches are instant. reset=true re-seeds from localStorage
    // for the (possibly new) market so the grid never flashes empty.
    function fetchDiscover(mk, reset) {
      if (reset) disc[1](exLsSeed(mk));
      discTab[1]("recommended");
      fetchTab(mk, "recommended");
      setTimeout(function () {
        ["rising", "hot", "newest"].forEach(function (tab) { fetchTab(mk, tab); });
      }, 350);
    }
    // Tab click: serve from client cache if present, else fetch. force=manual refresh.
    function loadTab(tab, force) {
      tab = tab || "recommended";
      discTab[1](tab);
      if (disc[0][tab] && !force) return;
      fetchTab(market[0], tab, force);
    }
    // Keyword search → list rows.
    function doSearch(opts) {
      opts = opts || {};
      var pg = opts.page || 1;
      page[1](pg); view[1]("results"); layout[1]("list");
      loading[1](true);
      fetchList({ q: (opts.q != null ? opts.q : q[0]), market: market[0], sort: sort[0], page: pg, limit: PAGE },
        function (r) { res[1](r); loading[1](false); refreshHistory(); });
    }
    // Category / "view more" → 3-per-row grid (browse).
    function browseGrid(opts) {
      opts = opts || {};
      var pg = opts.page || 1;
      page[1](pg); view[1]("results"); layout[1]("grid");
      loading[1](true);
      fetchList({ market: market[0], category: (opts.category != null ? opts.category : category[0]),
        sort: (opts.sort != null ? opts.sort : sort[0]), page: pg, limit: 15 },
        function (r) { res[1](r); loading[1](false); });
    }
    useEffect(function () {
      loadCats(market[0]); fetchDiscover(market[0], true);
      api("/favorites").then(function (r) { favs[1]((r && r.favorites) || []); }).catch(function () { });
      api("/search_history").then(function (r) { history[1]((r && r.history) || []); }).catch(function () { });
      api("/markets").then(function (r) { var m = (r && r.markets) || []; if (m.length) { markets[1](m); exMarketsSave(m); } }).catch(function () { });
    }, []);
    function favSlugs() { return (favs[0] || []).map(function (f) { return (f && f.slug) ? f.slug : f; }); }
    function toggleFav(slug, add, sk) {
      var meta = sk ? { name: sk.displayName || sk.name, summary: sk.summary, market: sk.market || market[0], url: sk.url, icon: sk.icon } : null;
      post("/favorites", { slug: slug, add: add, meta: meta }).then(function (r) { favs[1]((r && r.favorites) || []); }).catch(function () { });
    }
    function isFav(slug) { return favSlugs().indexOf(slug) >= 0; }
    function refreshHistory() { api("/search_history").then(function (r) { history[1]((r && r.history) || []); }).catch(function () { }); }
    var scores = useState({});            // slug -> score result (on-demand)
    var scoringAll = useState(false);     // "全部体检" batch in progress
    function setScore(slug, val) { scores[1](function (prev) { var c = Object.assign({}, prev); c[slug] = val; return c; }); }
    function loadScore(slug) {
      setScore(slug, { loading: true });
      api("/skill_score?slug=" + encodeURIComponent(slug))
        .then(function (r) { setScore(slug, r); })
        .catch(function (e) { setScore(slug, { ok: false, error: String(e) }); });
    }
    // "全部体检" — score every result on the current page (concurrency-limited so we
    // don't fire 30 market resolves at once). Reuses the same /skill_score path as the
    // single-skill chip, so the hover breakdown is identical.
    function scoreAll() {
      var list = (res[0] && res[0].skills) || [];
      var queue = list.filter(function (sk) { return sk && sk.slug && !(scores[0][sk.slug] && scores[0][sk.slug].ok); }).map(function (sk) { return sk.slug; });
      if (!queue.length) return;
      scoringAll[1](true);
      queue.forEach(function (slug) { setScore(slug, { loading: true }); });
      var CONC = 4, idx = 0, active = 0;
      function next() {
        if (idx >= queue.length) { if (active === 0) scoringAll[1](false); return; }
        var slug = queue[idx++]; active++;
        api("/skill_score?slug=" + encodeURIComponent(slug))
          .then(function (r) { setScore(slug, r); })
          .catch(function (e) { setScore(slug, { ok: false, error: String(e) }); })
          .finally(function () { active--; next(); });
      }
      for (var i = 0; i < Math.min(CONC, queue.length); i++) next();
    }
    function scoreChip(slug) {
      var sc = scores[0][slug];
      if (!sc) return h("button", { className: "ex-btn", onClick: function () { loadScore(slug); } }, t("scoreRun"));
      if (sc.loading) return h("span", { className: "ex-meta" }, "…");
      if (!sc.ok) return h("span", { className: "ex-meta", title: sc.error || "" }, "?");
      var recoMap = { recommended: t("recoYes"), caution: t("recoCaution"), not_recommended: t("recoNo") };
      var reco = recoMap[sc.recommendation];
      var dims = sc.dimensions || [];
      var pop = h("div", { key: "pop", className: "ex-score-pop" }, [
        h("div", { key: "h", className: "ex-score-pop-head" }, t("scoreTitle") + " · " + (sc.score != null ? sc.score : "?") + "/100 (" + sc.grade + ")"),
        h("div", { key: "rows" }, dims.map(function (d, i) {
          var pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
          return h("div", { key: i, className: "ex-score-pop-row" }, [
            h("span", { key: "n", className: "ex-score-pop-name" }, d.name),
            h("span", { key: "bar", className: "ex-score-pop-bar" }, h("span", { className: "ex-score-pop-fill", style: { width: pct + "%" } })),
            h("span", { key: "s", className: "ex-score-pop-num" }, d.score + "/" + d.max),
          ]);
        })),
        (sc.reliability && sc.reliability.note) ? h("div", { key: "rel", className: "ex-score-pop-rel" }, sc.reliability.note) : null,
      ]);
      return h("span", { className: "ex-score-result ex-score-has-pop", title: "" }, [
        h("span", { key: "g", className: "ex-grade-badge grade-" + sc.grade, style: gradeStyle(sc.grade) }, sc.grade),
        h("span", { key: "s", className: "ex-score-num" }, (sc.score != null ? sc.score + "/100" : "") + (reco ? " · " + reco : "")),
        pop,
      ]);
    }

    function onMarket(v) { market[1](v); category[1](""); q[1](""); loadCats(v); view[1]("discover"); fetchDiscover(v, true); }
    function onCategory(v) {
      category[1](v);
      if (!v) { view[1]("discover"); }
      else { browseGrid({ category: v, sort: "downloads", page: 1 }); }
    }
    function onSort(v) { sort[1](v); if (view[0] === "results") { (layout[0] === "list" ? doSearch : browseGrid)({ sort: v, page: 1 }); } }
    function backToDiscover() { view[1]("discover"); category[1](""); q[1](""); }
    function install(slug) {
      setInst(slug, { state: "installing", elapsed: 0 });
      post("/install", { slug: slug, market: market[0] }).then(function (r) {
        if (!r || !r.ok || !r.job_id) { setInst(slug, { state: "fail", msg: (r && r.error) || "?" }); return; }
        pollInstall(slug, r.job_id);
      }).catch(function (e) { setInst(slug, { state: "fail", msg: String(e) }); });
    }
    function pollInstall(slug, jobId) {
      var tick = function () {
        api("/install_status?id=" + encodeURIComponent(jobId)).then(function (s) {
          if (!s || !s.ok) { setInst(slug, { state: "fail", msg: (s && s.error) || "?" }); return; }
          if (s.state === "done" || s.state === "failed") {
            var res = s.result || {};
            if (s.state === "done" && res.ok) setInst(slug, { state: "ok", msg: (res.version ? "@" + res.version : "") });
            else { var fr = res.friendly || {}; setInst(slug, { state: "fail", msg: (fr.reason || res.error || "?"), fix: fr.fix }); }
            return;
          }
          setInst(slug, { state: "installing", elapsed: s.elapsed_s || 0, stage: s.stage });
          setTimeout(tick, 1000);
        }).catch(function (e) { setInst(slug, { state: "fail", msg: String(e) }); });
      };
      setTimeout(tick, 700);
    }

    var r = res[0];
    var total = (r && r.total) || 0;
    var gridLim = layout[0] === "grid" ? 15 : PAGE;
    var pages = total ? Math.max(1, Math.ceil(total / gridLim)) : ((r && r.skills && r.skills.length === gridLim) ? page[0] + 1 : page[0]);
    var sortOpts = [["relevance", t("sortRelevance")], ["downloads", t("sortDownloads")], ["stars", t("sortStars")], ["latest", t("sortLatest")]];

    function skillRow(sk, i) {
      var stt = inst[0][sk.slug] || {};
      var busy = stt.state === "installing";
      var statusEl = null;
      if (stt.state === "installing") statusEl = h("span", { className: "ex-status-busy" }, t("installing") + (stt.elapsed ? " " + stt.elapsed + "s" : ""));
      else if (stt.state === "ok") statusEl = h("span", { className: "ex-status-ok", title: t("installed") }, "✓");
      else if (stt.state === "fail") statusEl = h("span", { className: "ex-status-bad", title: (stt.msg || "") + (stt.fix ? " — " + stt.fix : "") }, "✗ " + (stt.msg || ""));
      var dl = fmtNum(sk.downloads); var stv = fmtNum(sk.stars);
      var initial = (sk.displayName || sk.slug || "?").charAt(0).toUpperCase();
      return h("div", { key: i, className: "ex-row2" + (sk.verified ? " verified" : "") },
        h("div", { className: "ex-avatar" }, sk.icon ? h("img", { src: sk.icon, onError: function (e) { e.target.style.display = "none"; } }) : initial),
        h("div", { className: "ex-row2-main" },
          h("div", { className: "ex-row2-title" }, [
            h("span", { key: "n", className: "name" }, sk.displayName || sk.slug || "?"),
            sk.verified ? h("span", { key: "vf", className: "ex-badge ex-badge-ok" }, "✓ " + t("verifiedBadge")) : null,
            sk.requires_api_key ? h("span", { key: "ak", className: "ex-badge ex-badge-key" }, "🔑 API Key") : null,
            sk.version ? h("span", { key: "v", className: "ex-badge" }, "v" + sk.version) : null,
          ]),
          sk.summary ? h("div", { className: "ex-row2-desc" }, sk.summary) : null,
          h("div", { className: "ex-row2-sub" }, [
            h("span", { key: "src", className: "ex-row2-src" }, t("from") + " " + srcLabel(sk.source, market[0])),
            sk.url ? h("a", { key: "hp", className: "ex-row2-home", href: sk.url, target: "_blank", rel: "noopener noreferrer", title: t("homepage") }, linkIcon()) : null,
          ])),
        h("div", { className: "ex-row2-meta" }, [
          (stv != null) ? h("span", { key: "s" }, "☆ " + stv) : null,
          (dl != null) ? h("span", { key: "d" }, "⬇ " + dl) : null,
        ]),
        h("div", { className: "ex-row2-actions" }, [
          statusEl,
          h("button", { key: "fv", className: "ex-heart" + (isFav(sk.slug) ? " on" : ""), title: t("favorite"), onClick: function () { toggleFav(sk.slug, !isFav(sk.slug), sk); } }, isFav(sk.slug) ? "♥" : "♡"),
          h("span", { key: "sc" }, scoreChip(sk.slug)),
          h("button", { key: "i", className: "ex-btn ex-btn-solid", onClick: function () { if (!busy) install(sk.slug); }, disabled: busy }, busy ? "…" : t("install")),
        ]));
    }

    function miniCard(sk, i) {
      var stt = inst[0][sk.slug] || {};
      var busy = stt.state === "installing";
      var ok = stt.state === "ok"; var fail = stt.state === "fail";
      var dl = fmtNum(sk.downloads); var stv = fmtNum(sk.stars);
      var initial = (sk.displayName || sk.slug || "?").charAt(0).toUpperCase();
      return h("div", { key: i, className: "ex-mini" + (sk.verified ? " verified" : "") },
        h("div", { className: "ex-mini-head" },
          h("div", { className: "ex-avatar" }, sk.icon ? h("img", { src: sk.icon, onError: function (e) { e.target.style.display = "none"; } }) : initial),
          h("div", { style: { minWidth: 0, flex: 1 } },
            h("div", { className: "ex-mini-title" }, sk.displayName || sk.slug || "?"),
            h("div", { className: "ex-mini-sub" }, (sk.verified ? "✓ " : "") + (dl != null ? "⬇ " + dl + "  " : "") + (stv != null ? "☆ " + stv : ""))),
          h("button", { key: "fav", className: "ex-heart" + (isFav(sk.slug) ? " on" : ""), title: t("favorite"), onClick: function () { toggleFav(sk.slug, !isFav(sk.slug), sk); } }, isFav(sk.slug) ? "♥" : "♡")),
        sk.summary ? h("div", { className: "ex-mini-desc" }, sk.summary) : null,
        h("div", { className: "ex-mini-foot" },
          sk.grade ? h("span", { className: "ex-score-result", title: t("scoreTitle") + (sk.score != null ? ": " + sk.score + "/100" : "") }, [
            h("span", { key: "g", className: "ex-grade-badge grade-" + sk.grade, style: gradeStyle(sk.grade) }, sk.grade),
            (sk.score != null) ? h("span", { key: "s", className: "ex-score-num" }, sk.score + "") : null,
          ]) : scoreChip(sk.slug),
          sk.url ? h("a", { className: "ex-row2-home", href: sk.url, target: "_blank", rel: "noopener noreferrer", title: t("homepage") }, linkIcon()) : h("span", null, ""),
          h("button", { className: "ex-btn ex-btn-solid ex-spacer", title: (fail && stt.msg) ? (stt.msg + (stt.fix ? " — " + stt.fix : "")) : "", onClick: function () { if (!busy) install(sk.slug); }, disabled: busy },
            busy ? (stt.elapsed ? stt.elapsed + "s" : "…") : (ok ? "✓" : (fail ? "✗" : t("install"))))));
    }

    function renderDiscover() {
      var cur = disc[0][discTab[0]];          // active-tab result {ok,skills,cached,age_s,stale}
      var skills = (cur && cur.ok && cur.skills) ? cur.skills : [];
      var tabs = [["recommended", t("discReco")], ["rising", t("discRising")], ["hot", t("discHot")], ["newest", t("discNewest")]];
      var cacheHint = (cur && cur.ok && cur.cached) ? (t("cachedHint") + (cur.age_s != null ? " · " + Math.round(cur.age_s / 60) + "m" : "")) : null;
      var activeLoading = !!discLoading[0][discTab[0]] && !cur;   // only when active tab has no data yet
      return h("div", { style: { marginTop: ".6rem" } },
        h("div", { className: "ex-disc-tabs" }, tabs.map(function (tb) {
          return h("button", { key: tb[0], className: discTab[0] === tb[0] ? "active" : "", onClick: function () { loadTab(tb[0]); } }, tb[1]);
        })),
        h("div", { style: { display: "flex", alignItems: "center", gap: ".6rem", marginTop: ".5rem", justifyContent: "flex-end" } }, [
          cacheHint ? h("span", { key: "ch", className: "ex-meta" }, cacheHint) : null,
          h("button", { key: "rf", className: "ex-btn", onClick: function () { loadTab(discTab[0], true); } }, t("refreshAll")),
        ]),
        activeLoading ? h("div", { className: "ex-empty", style: { textAlign: "center", padding: "1.5rem 0" } }, "…") :
          (cur && !cur.ok ? h("div", { className: "ex-notice" }, cur.error || "?") :
            (skills.length === 0 ? h("div", { className: "ex-empty" }, t("noResults")) :
              h("div", { className: "ex-mini-grid", style: { marginTop: ".5rem" } }, skills.map(miniCard)))),
        (skills.length) ? h("div", { className: "ex-more" },
          h("button", { className: "ex-btn", onClick: function () { var so = DISC_SORT[discTab[0]] || "downloads"; sort[1](so); browseGrid({ category: "", sort: so, page: 1 }); } }, t("viewMore"))) : null);
    }

    return h("div", { className: "ex-section" },
      h("div", { className: "ex-section-title" }, t("searchTitle")),
      h("div", { className: "ex-controls" }, [
          h("select", { key: "mk", value: market[0], onChange: function (e) { onMarket(e.target.value); },
            className: "rounded border bg-transparent px-2 py-1.5 text-sm" },
            ((markets[0] && markets[0].length) ? markets[0] : EX_BUILTIN_MARKETS).map(function (m) {
              return h("option", { key: m.id, value: m.id }, m.label || m.id);
            })),
          h("select", { key: "so", value: sort[0], onChange: function (e) { onSort(e.target.value); },
            className: "rounded border bg-transparent px-2 py-1.5 text-sm" },
            sortOpts.map(function (o) { return h("option", { key: o[0], value: o[0] }, t("sortBy") + ": " + o[1]); })),
          h("div", { key: "in", className: "flex-1 min-w-44" }, field({
            value: q[0], placeholder: t("searchPh"),
            onChange: function (e) { q[1](e.target.value); },
            onKeyDown: function (e) { if (e.key === "Enter") doSearch({ page: 1 }); },
          })),
          h("button", { key: "go", className: "ex-btn ex-btn-primary", onClick: function () { doSearch({ page: 1 }); } }, loading[0] ? "…" : t("search")),
        ]),
        (cats[0] && cats[0].length) ? h("div", { className: "ex-pills", style: { marginTop: ".55rem" } },
          [h("button", { key: "_all", className: category[0] === "" ? "active" : "", onClick: function () { onCategory(""); } }, t("catAll"))].concat(
            cats[0].map(function (c) { return h("button", { key: c, className: category[0] === c ? "active" : "", onClick: function () { onCategory(c); } }, catLabel(c, loc)); }))) : null,
        view[0] === "discover" ? renderDiscover() : null,
        (view[0] === "discover" && history[0] && history[0].length) ? h("div", { className: "ex-pills", style: { marginTop: ".5rem" } },
          [h("span", { key: "_h", className: "ex-meta", style: { marginRight: ".3rem" } }, t("recentSearch") + ":")].concat(
            history[0].slice(0, 8).map(function (hq, i) {
              return h("button", { key: i, onClick: function () { q[1](hq); doSearch({ q: hq, page: 1 }); } }, hq);
            }))) : null,
        view[0] === "results" ? h("div", { className: "mt-3" },
          h("div", { style: { display: "flex", alignItems: "center", gap: ".6rem", marginBottom: ".55rem", flexWrap: "wrap" } },
            h("button", { className: "ex-btn", onClick: backToDiscover }, t("backDiscover")),
            (r && r.stale) ? h("span", { className: "ex-notice" }, "⚠ " + t("cachedNotice")) : null,
            (total) ? h("span", { className: "ex-meta" }, total + " " + t("resultsTotal")) : null,
            (r && r.expanded && r.expanded.length) ? h("span", { className: "ex-badge ex-badge-ok", title: t("alsoSearched") }, "+ " + r.expanded.join(", ")) : null,
            null),
          loading[0] ? h("div", { className: "ex-loadwrap" }, [
            h("div", { key: "bar", className: "ex-loadbar" }),
            h("div", { key: "txt", className: "ex-searching-row" }, [
              h("span", { key: "s", className: "ex-spin" }),
              h("span", { key: "t" }, t("searching")),
            ]),
          ]) : null,
          (r && !r.ok && !loading[0]) ? h("div", { className: "ex-status-bad" }, r.error) : null,
          (r && r.ok) ? h("div", { className: loading[0] ? "ex-dim" : "" },
            (r.skills || []).length === 0 ? (loading[0] ? null : h("div", { className: "ex-empty" }, t("noResults"))) :
              (layout[0] === "list"
                ? h("div", { className: "ex-list" }, (r.skills || []).map(skillRow))
                : h("div", { className: "ex-mini-grid" }, (r.skills || []).map(miniCard)))
          ) : null,
          (r && r.ok && (r.skills || []).length && !loading[0]) ? h("div", { className: "ex-pager" }, [
            h("button", { key: "p", className: "ex-btn", onClick: function () { if (page[0] > 1) (layout[0] === "list" ? doSearch : browseGrid)({ page: page[0] - 1 }); }, disabled: page[0] <= 1 }, t("prev")),
            h("span", { key: "pg", className: "ex-page-ind" }, t("page") + " " + page[0] + " / " + pages),
            h("button", { key: "n", className: "ex-btn", onClick: function () { if (page[0] < pages) (layout[0] === "list" ? doSearch : browseGrid)({ page: page[0] + 1 }); }, disabled: page[0] >= pages }, t("next")),
          ]) : null
        ) : null,
    );
  }

  // One installed skill as a 3-per-row card. "View" opens the full detail page;
  // "Uninstall" removes the skill (with confirm).
  function InstalledCard(props) {
    var t = props.t, sk = props.sk, onView = props.onView, onUninstall = props.onUninstall, busy = props.busy, upd = props.upd;
    var slug = sk.slug || sk.name;
    var initial = (slug || "?").charAt(0).toUpperCase();
    var canUpd = upd && upd.update_available;
    return h("div", { className: "ex-mini ex-mini-clickable", onClick: function () { onView(sk); }, title: t("viewDetail") },
      h("div", { className: "ex-mini-head" },
        h("div", { className: "ex-card-icon" }, initial),
        h("div", { style: { minWidth: 0, flex: 1 } },
          h("div", { className: "ex-mini-title" }, sk.displayName || slug),
          h("div", { className: "ex-mini-sub" }, (sk.version ? "v" + sk.version + "  " : "") + (sk.market || "")))),
      h("div", { className: "ex-badges" }, [
        sk.has_skill_md ? h("span", { key: "s", className: "ex-badge" }, "SKILL.md") : null,
        h("span", { key: "c", className: "ex-badge" }, t("calls") + ": " + (sk.calls || 0)),
        canUpd ? h("span", { key: "u", className: "ex-badge ex-badge-key", title: t("updateAvail") }, "↑ " + (upd.current || "?") + "→" + (upd.latest || "?")) : null,
      ]),
      h("div", { className: "ex-mini-foot" }, [
        h("button", { key: "v", className: "ex-btn ex-btn-primary", onClick: function (e) { e.stopPropagation(); onView(sk); } }, t("viewDetail")),
        h("button", { key: "x", className: "ex-btn", onClick: function (e) { e.stopPropagation(); if (!props.converting) props.onConvert(sk); }, disabled: props.converting, title: t("toHermesHint") }, props.converting ? t("converting") : t("toHermes")),
        h("button", { key: "u", className: "ex-btn ex-btn-danger ex-spacer", onClick: function (e) { e.stopPropagation(); if (!busy) onUninstall(sk); }, disabled: busy }, busy ? t("uninstalling") : t("uninstall")),
      ]));
  }

  // Full-page skill detail: header + file picker + Markdown preview/edit + save.
  function SkillDetailPage(props) {
    var t = props.t, slug = props.slug, onBack = props.onBack;
    var detail = useState(null);
    var sel = useState("");
    var content = useState("");
    var saveMsg = useState("");
    var mode = useState("preview");
    var runs = useState(null);
    var creds = useState(null);
    var credVals = useState({});
    var credMsg = useState("");
    var newKey = useState("");
    var reqs = useState(null);
    var smoke = useState(null);
    var smoking = useState(false);
    var score = useState(null);
    var scoring = useState(false);
    var scoreOpen = useState(true);     // collapse toggle for the score breakdown
    function loadFile(path) {
      sel[1](path); content[1](""); saveMsg[1]("");
      api("/skill_file?slug=" + encodeURIComponent(slug) + "&path=" + encodeURIComponent(path))
        .then(function (r) { content[1](r && r.ok ? (r.content || "") : ("[" + ((r && r.error) || "?") + "]")); })
        .catch(function (e) { content[1]("[" + String(e) + "]"); });
    }
    useEffect(function () {
      api("/skill?slug=" + encodeURIComponent(slug)).then(function (r) {
        detail[1](r);
        if (r && r.ok) {
          var files = r.files || [];
          var md = null;
          for (var i = 0; i < files.length; i++) { if (files[i].toLowerCase() === "skill.md") { md = files[i]; break; } }
          if (md && r.skill_md != null) { sel[1](md); content[1](r.skill_md); }
          else if (files.length) { loadFile(files[0]); }
        }
      }).catch(function (e) { detail[1]({ ok: false, error: String(e) }); });
      // Run history for this skill (read-only diagnostics).
      api("/skill_runs?slug=" + encodeURIComponent(slug) + "&limit=50")
        .then(function (r) { runs[1](r); }).catch(function (e) { runs[1]({ ok: false, error: String(e) }); });
      // A: declared API keys + which are set (values never returned).
      api("/skill_credentials?slug=" + encodeURIComponent(slug))
        .then(function (r) { creds[1](r); }).catch(function () { });
      // C: environment readiness (bins + keys).
      api("/skill_requirements?slug=" + encodeURIComponent(slug))
        .then(function (r) { reqs[1](r); }).catch(function () { });
      // auto-load the health score (no button — show it directly).
      scoring[1](true);
      api("/skill_score?slug=" + encodeURIComponent(slug))
        .then(function (r) { score[1](r); }).catch(function (e) { score[1]({ ok: false, error: String(e) }); })
        .finally(function () { scoring[1](false); });
    }, []);
    function runSmoke() {
      smoking[1](true); smoke[1](null);
      post("/skill_smoketest", { slug: slug })
        .then(function (r) { smoke[1](r); }).catch(function (e) { smoke[1]({ ok: false, error: String(e) }); })
        .finally(function () { smoking[1](false); });
    }
    function renderReqs() {
      var rq = reqs[0];
      if (!rq || !rq.ok) return null;
      var hasChecks = rq.checks && rq.checks.length;
      var hasCaps = rq.capabilities && rq.capabilities.length;
      if (!hasChecks && !hasCaps) return null;
      return h("div", { key: "reqs", className: "ex-runs" }, [
        h("div", { key: "h", className: "ex-runs-title" }, t("envCheck") + " " + (rq.ready ? "✓" : "⚠")),
        hasCaps ? h("div", { key: "caps", className: "ex-badges", style: { marginBottom: ".4rem" } },
          [h("span", { key: "_l", className: "ex-meta" }, t("scoreCaps") + ": ")].concat(rq.capabilities.map(function (c, i) { return h("span", { key: i, className: "ex-badge ex-badge-key" }, c); }))) : null,
        hasChecks ? h("div", { key: "l", style: { display: "flex", flexDirection: "column", gap: ".25rem" } }, rq.checks.map(function (c, i) {
          return h("div", { key: i, className: "ex-run-row" }, [
            h("span", { key: "ok", className: c.ok ? "ex-status-ok" : "ex-status-bad" }, c.ok ? "✓" : "✗"),
            h("span", { key: "ty", className: "ex-badge" }, c.type === "bin" ? t("envBin") : t("envKey")),
            h("span", { key: "nm", className: "ex-run-entry" }, c.name),
            !c.ok ? h("span", { key: "hh", className: "ex-meta" }, c.type === "bin" ? t("envBinMissing") : t("envKeyMissing")) : null,
          ]);
        })) : null,
      ]);
    }
    function renderSmoke() {
      var sm = smoke[0];
      var msg = null;
      if (sm) {
        if (sm.ok) {
          msg = h("div", { key: "r", className: "ex-status-ok" }, "✓ " + t("smokeOk") + (sm.entry ? " (" + sm.entry + ")" : ""));
        } else if (sm.kind === "doc") {
          msg = h("div", { key: "r", className: "ex-status-info" }, "ℹ️ " + ((sm.friendly && sm.friendly.reason) || "") + ((sm.friendly && sm.friendly.fix) ? " — " + sm.friendly.fix : ""));
        } else {
          // Build a meaningful failure line (never a bare "✗ ?").
          var detail = (sm.friendly && sm.friendly.reason)
            || sm.error
            || (sm.stderr && String(sm.stderr).trim())
            || (sm.stdout && String(sm.stdout).trim())
            || "";
          detail = String(detail).replace(/\s+/g, " ").slice(0, 200);
          var line = "✗ ";
          if (sm.exit_code != null) line += t("smokeExit") + " " + sm.exit_code + (detail ? " — " + detail : "");
          else line += (detail || t("smokeNeedsArgs"));
          if (!detail && sm.exit_code != null) line += " — " + t("smokeNeedsArgs");
          msg = h("div", { key: "r", className: "ex-status-bad" }, [
            h("div", { key: "l" }, line),
            h("div", { key: "h", className: "ex-meta", style: { marginTop: ".25rem" } }, t("smokeHint")),
          ]);
        }
      }
      return h("div", { key: "smoke", className: "ex-runs" }, [
        h("div", { key: "h", className: "ex-runs-title", style: { display: "flex", alignItems: "center", gap: ".5rem" } }, [
          h("span", { key: "t" }, t("smokeTitle")),
          h("button", { key: "b", className: "ex-btn ex-btn-primary", onClick: runSmoke, disabled: smoking[0] }, smoking[0] ? t("running") : t("smokeRun")),
        ]),
        msg,
      ]);
    }
    function renderScore() {
      var sc = score[0];
      var head = h("div", { key: "h", className: "ex-runs-title", style: { display: "flex", alignItems: "center", gap: ".5rem" } }, [
        h("span", { key: "t" }, t("scoreTitle")),
        (scoring[0] && !sc) ? h("span", { key: "ld", className: "ex-spin" }) : null,
        (sc && sc.ok) ? h("span", { key: "bg", className: "ex-grade-badge grade-" + sc.grade, style: gradeStyle(sc.grade) }, sc.grade) : null,
        (sc && sc.ok) ? h("span", { key: "nm", className: "ex-score-num" }, sc.score + "/100 · " +
          (sc.recommendation === "recommended" ? t("recoYes") : (sc.recommendation === "caution" ? t("recoCaution") : t("recoNo")))) : null,
        (sc && sc.ok) ? h("button", { key: "tg", type: "button", className: "ex-term-toggle", style: { marginLeft: "auto" },
          title: scoreOpen[0] ? t("collapse") : t("expand"),
          onClick: function () { scoreOpen[1](!scoreOpen[0]); } }, scoreOpen[0] ? "▾" : "▸") : null,
      ]);
      var body = null;
      if (sc && !sc.ok) {
        body = h("div", { key: "e", className: "ex-status-bad" }, sc.error || "?");
      } else if (sc && sc.ok && scoreOpen[0]) {
        body = h("div", { key: "c", className: "ex-score", style: { marginTop: ".5rem" } }, [
          (sc.capabilities && sc.capabilities.length) ? h("div", { key: "caps", className: "ex-badges", style: { marginBottom: ".5rem" } },
            [h("span", { key: "_l", className: "ex-meta" }, t("scoreCaps") + ": ")].concat(sc.capabilities.map(function (c, i) { return h("span", { key: i, className: "ex-badge ex-badge-key" }, c); }))) : null,
          h("div", { key: "dims", style: { display: "flex", flexDirection: "column", gap: ".4rem" } }, (sc.dimensions || []).map(function (d, i) {
            var pct = d.max ? Math.round(d.score / d.max * 100) : 0;
            return h("div", { key: i, className: "ex-dim" }, [
              h("div", { key: "l", className: "ex-dim-head" }, [h("span", { key: "n" }, d.name), h("span", { key: "v", className: "ex-meta" }, d.score + "/" + d.max)]),
              h("div", { key: "bar", className: "ex-dim-bar" }, h("div", { className: "ex-dim-fill", style: { width: pct + "%" } })),
              (d.reasons && d.reasons.length) ? h("div", { key: "r", className: "ex-meta" }, d.reasons.join(" · ")) : null,
            ]);
          })),
          (sc.blockers && sc.blockers.length) ? h("div", { key: "bl", className: "ex-status-bad", style: { marginTop: ".4rem" } }, "⛔ " + sc.blockers.join("；")) : null,
        ]);
      }
      return h("div", { key: "score", className: "ex-runs" }, [head, body]);
    }
    function reloadCreds() { api("/skill_credentials?slug=" + encodeURIComponent(slug)).then(creds[1]).catch(function () { }); }
    function setCredVal(k, v) { var c = Object.assign({}, credVals[0]); c[k] = v; credVals[1](c); }
    function saveCred(key, val) {
      credMsg[1](t("saving"));
      post("/skill_credentials", { slug: slug, key: key, value: val })
        .then(function (r) { credMsg[1](r && r.ok ? t("saved") : t("saveFail")); setCredVal(key, ""); reloadCreds(); })
        .catch(function () { credMsg[1](t("saveFail")); });
    }
    function clearCred(key) { post("/skill_credentials", { slug: slug, key: key, value: "" }).then(function () { reloadCreds(); }).catch(function () { }); }
    function renderCreds() {
      var cv = creds[0];
      if (!cv || !cv.ok) return null;
      var declared = cv.declared || []; var setKeys = cv.set || [];
      var keys = declared.slice();
      setKeys.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
      return h("div", { key: "creds", className: "ex-runs" }, [
        h("div", { key: "h", className: "ex-runs-title" }, "🔑 " + t("credentials")),
        h("div", { key: "hint", className: "ex-meta", style: { marginBottom: ".5rem", lineHeight: 1.5 } }, t("credHint")),
        keys.length === 0 ? h("div", { key: "n", className: "ex-meta" }, t("credNone")) : null,
        h("div", { key: "rows", style: { display: "flex", flexDirection: "column", gap: ".4rem" } }, keys.map(function (k) {
          var isSet = setKeys.indexOf(k) >= 0;
          return h("div", { key: k, className: "ex-cred-row" }, [
            h("span", { key: "k", className: "ex-cred-key" }, k),
            isSet ? h("span", { key: "b", className: "ex-badge ex-badge-ok" }, "✓ " + t("credSet")) : null,
            h("input", { key: "i", type: "password", className: "ex-cred-input", placeholder: isSet ? "••••••" : t("credValuePh"), value: credVals[0][k] || "", onChange: function (e) { setCredVal(k, e.target.value); } }),
            h("button", { key: "s", className: "ex-btn ex-btn-primary", onClick: function () { saveCred(k, credVals[0][k] || ""); } }, t("credSave")),
            isSet ? h("button", { key: "c", className: "ex-btn ex-btn-danger", onClick: function () { clearCred(k); } }, t("credClear")) : null,
          ]);
        })),
        h("div", { key: "add", className: "ex-cred-row" }, [
          h("input", { key: "nk", className: "ex-cred-input", placeholder: t("credKeyPh"), value: newKey[0], onChange: function (e) { newKey[1](e.target.value); } }),
          h("input", { key: "nv", type: "password", className: "ex-cred-input", placeholder: t("credValuePh"), value: credVals[0]["__new"] || "", onChange: function (e) { setCredVal("__new", e.target.value); } }),
          h("button", { key: "a", className: "ex-btn", onClick: function () { var k = (newKey[0] || "").trim(); if (!k) return; saveCred(k, credVals[0]["__new"] || ""); newKey[1](""); setCredVal("__new", ""); } }, t("credAdd")),
        ]),
        credMsg[0] ? h("div", { key: "m", className: "ex-meta" }, credMsg[0]) : null,
      ]);
    }
    function fmtTs(ts) { try { return new Date((ts || 0) * 1000).toLocaleString(); } catch (e) { return String(ts); } }
    function renderRuns() {
      var rv = runs[0];
      if (!rv) return h("div", { key: "runs", className: "ex-runs" }, h("div", { className: "ex-meta" }, "…"));
      if (!rv.ok) {
        return null;
      }
      var sm = rv.summary || {}; var list = rv.runs || [];
      return h("div", { key: "runs", className: "ex-runs" }, [
        h("div", { key: "h", className: "ex-runs-title" }, t("runHistory")),
        h("div", { key: "sm", className: "ex-runs-summary" }, [
          h("span", { key: "t" }, t("runsTotal") + ": " + (sm.total || 0)),
          h("span", { key: "sr" }, t("runsSuccess") + ": " + (sm.success_rate != null ? Math.round(sm.success_rate * 100) + "%" : "—")),
          h("span", { key: "av" }, t("runsAvg") + ": " + (sm.avg_ms != null ? sm.avg_ms + "ms" : "—")),
          h("span", { key: "ls" }, t("runsLast") + ": " + (sm.last_ts ? fmtTs(sm.last_ts) : "—")),
        ]),
        list.length === 0 ? h("div", { key: "e", className: "ex-empty" }, t("noRuns")) :
          h("div", { key: "l", className: "ex-runs-list" }, list.map(function (r, i) {
            return h("div", { key: i, className: "ex-run-row" }, [
              h("span", { key: "ok", className: r.ok ? "ex-status-ok" : "ex-status-bad" }, r.ok ? "✓" : "✗"),
              h("span", { key: "en", className: "ex-run-entry" }, r.entry || "?"),
              h("span", { key: "d", className: "ex-meta" }, (r.duration_ms != null ? r.duration_ms + "ms" : "")),
              h("span", { key: "ts", className: "ex-meta" }, fmtTs(r.ts)),
              r.error ? h("span", { key: "er", className: "ex-status-bad ex-run-err" }, String(r.error)) : null,
            ]);
          })),
      ]);
    }
    function save() {
      saveMsg[1](t("saving"));
      post("/skill_file", { slug: slug, path: sel[0], content: content[0] })
        .then(function (r) { saveMsg[1](r && r.ok ? t("saved") : (t("saveFail") + ": " + ((r && r.error) || "?"))); })
        .catch(function (e) { saveMsg[1](t("saveFail") + ": " + String(e)); });
    }
    var d = detail[0];
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-detail-bar" },
        h("button", { className: "ex-btn", onClick: onBack }, t("backInstalled")),
        h("div", { className: "ex-detail-name" }, slug),
        null),
      !d ? h("div", { className: "ex-empty" }, t("loadingStatus")) :
        (!d.ok ? h("div", { className: "ex-status-bad" }, d.error || "?") :
          h("div", { className: "ex-detail" }, [
            (d.meta && (d.meta.description || d.meta.homepage || (d.meta.requires_bins && d.meta.requires_bins.length))) ?
              h("div", { key: "mt", className: "ex-detail-meta" }, [
                d.meta.description ? h("p", { key: "ds", className: "ex-detail-desc" }, d.meta.description) : null,
                h("div", { key: "row", className: "ex-meta", style: { display: "flex", flexWrap: "wrap", gap: ".8rem" } }, [
                  d.meta.homepage ? h("a", { key: "hp", className: "ex-link", href: d.meta.homepage, target: "_blank", rel: "noopener noreferrer" }, t("homepage")) : null,
                  h("span", { key: "dep" }, t("deps") + ": " + ((d.meta.requires_bins && d.meta.requires_bins.length) ? d.meta.requires_bins.join(", ") : t("noDeps"))),
                  d.dir ? h("span", { key: "dir", style: { fontFamily: "ui-monospace, monospace", fontSize: ".72rem" } }, d.dir) : null,
                ]),
              ]) : null,
            renderScore(),
            renderReqs(),
            renderRuns(),
            renderSmoke(),
            h("div", { key: "ctl", className: "ex-controls", style: { marginTop: ".6rem" } }, [
              h("select", { key: "f", value: sel[0], onChange: function (e) { loadFile(e.target.value); } },
                (d.files || []).map(function (f) { return h("option", { key: f, value: f }, f); })),
              isMarkdown(sel[0]) ? h("button", { key: "tg", className: "ex-btn", onClick: function () { mode[1](mode[0] === "preview" ? "edit" : "preview"); } }, mode[0] === "preview" ? t("edit") : t("preview")) : null,
              h("button", { key: "sv", className: "ex-btn ex-btn-primary ex-spacer", onClick: save }, t("save")),
            ]),
            (mode[0] === "preview" && isMarkdown(sel[0]))
              ? h("div", { key: "bd", className: "omnilimb-md ex-detail-body", dangerouslySetInnerHTML: { __html: mdToHtml(content[0]) } })
              : h("textarea", { key: "bd", className: "ex-detail-edit", value: content[0], onChange: function (e) { content[1](e.target.value); }, rows: 22 }),
            saveMsg[0] ? h("div", { key: "sm", className: "ex-meta" }, saveMsg[0]) : null,
          ])));
  }

  function InstalledPanel() {
    var t = useTr();
    var d = useState(null);
    var selected = useState("");        // slug being viewed; "" = grid
    var uninstalling = useState({});    // slug -> bool
    var converting = useState({});      // slug -> bool (→ Hermes convert)
    var updates = useState({});         // slug -> {current, latest, update_available}
    function load() {
      d[1](null);
      api("/installed").then(d[1]).catch(function (e) { d[1]({ ok: false, error: String(e) }); });
      loadUpdates(false);
    }
    // D: update-available check (stale-while-revalidate). If the backend is still
    // computing in the background, poll once more shortly so badges fill in.
    function loadUpdates(retried) {
      api("/skill_updates").then(function (r) {
        updates[1]((r && r.updates) || {});
        if (r && r.refreshing && !retried) { setTimeout(function () { loadUpdates(true); }, 7000); }
      }).catch(function () { });
    }
    useEffect(function () { load(); }, []);
    function setUn(slug, v) { uninstalling[1](function (prev) { var c = Object.assign({}, prev); c[slug] = v; return c; }); }
    function setCv(slug, v) { converting[1](function (prev) { var c = Object.assign({}, prev); c[slug] = v; return c; }); }
    function doConvert(sk) {
      var slug = sk.slug || sk.name;
      setCv(slug, true);
      post("/convert", { slug: slug, mode: "ai_curated", overwrite: true })
        .then(function (r) {
          if (r && r.ok) { window.alert("\u2713 " + slug + " \u2192 Hermes"); }
          else { window.alert((r && r.error) || "convert failed"); }
        })
        .catch(function (e) { window.alert(String(e)); })
        .finally(function () { setCv(slug, false); });
    }
    function doUninstall(sk) {
      var slug = sk.slug || sk.name;
      if (!window.confirm(t("confirmUninstall").replace("%s", slug))) return;
      setUn(slug, true);
      post("/uninstall", { slug: slug })
        .then(function (r) { if (r && r.ok) { load(); } else { window.alert(t("uninstallFail") + ": " + ((r && r.error) || "?")); } })
        .catch(function (e) { window.alert(t("uninstallFail") + ": " + String(e)); })
        .finally(function () { setUn(slug, false); });
    }
    // Full detail page replaces the grid (a "new page" within the tab).
    if (selected[0]) {
      return h(SkillDetailPage, { t: t, slug: selected[0], onBack: function () { selected[1](""); load(); } });
    }
    function doExport() {
      api("/export_skills").then(function (r) {
        try {
          var blob = new Blob([JSON.stringify(r, null, 2)], { type: "application/json" });
          var u = URL.createObjectURL(blob);
          var a = document.createElement("a"); a.href = u; a.download = "omnilimb-skills.json";
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        } catch (e) { /* ignore */ }
      }).catch(function () { });
    }
    function doImport(file) {
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var manifest;
        try { manifest = JSON.parse(reader.result); } catch (e) { window.alert("invalid JSON"); return; }
        post("/import_skills", { manifest: manifest }).then(function (r) {
          var oks = (r.results || []).filter(function (x) { return x.ok; }).length;
          window.alert(t("importDone") + ": " + oks + "/" + ((r.results || []).length));
          load();
        }).catch(function (e) { window.alert(String(e)); });
      };
      reader.readAsText(file);
    }
    var v = d[0];
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-controls", style: { justifyContent: "space-between", marginBottom: ".7rem" } },
        h("div", { className: "ex-section-title", style: { margin: 0 } }, t("installedTitle")),
        h("div", { style: { display: "flex", gap: ".4rem", alignItems: "center" } }, [
          h("button", { key: "ex", className: "ex-btn", onClick: doExport }, t("exportSkills")),
          h("label", { key: "im", className: "ex-btn", style: { cursor: "pointer" } }, [
            t("importSkills"),
            h("input", { key: "f", type: "file", accept: ".json,application/json", style: { display: "none" }, onChange: function (e) { doImport(e.target.files && e.target.files[0]); e.target.value = ""; } }),
          ]),
          h("button", { key: "rf", className: "ex-btn", onClick: load }, t("refresh")),
        ])),
      !v ? h("div", { className: "ex-empty" }, t("loadingStatus")) :
        (!v.ok ? h("div", { className: "ex-status-bad" }, v.error || "?") :
          ((v.skills || []).length === 0 ? h("div", { className: "ex-empty" }, t("noInstalled")) :
            h("div", { className: "ex-mini-grid" }, (v.skills || []).map(function (sk, i) {
              var slug = sk.slug || sk.name;
              return h(InstalledCard, { key: i, sk: sk, t: t, busy: !!uninstalling[0][slug], upd: updates[0][slug],
                onView: function (s) { selected[1](s.slug || s.name); },
                converting: !!converting[0][slug], onConvert: doConvert,
                onUninstall: doUninstall });
            })))),
      (v && v.ok) ? h("div", { className: "ex-meta", style: { marginTop: ".7rem" } }, t("workspace") + ": " + (v.workspace || "")) : null,
    );
  }

  // Favorites tab — its own page. Lists rich favorite entries as cards with a
  // link icon, an Install action (same job + poll flow as Search) and a Remove.
  function FavoritesPanel() {
    var t = useTr();
    var favs = useState(null);          // array of rich entries (or slug strings)
    var inst = useState({});            // slug -> {state,elapsed,msg,fix}
    function load() {
      favs[1](null);
      api("/favorites").then(function (r) { favs[1]((r && r.favorites) || []); }).catch(function () { favs[1]([]); });
    }
    useEffect(function () { load(); }, []);
    function setInst(slug, val) { inst[1](function (prev) { var c = Object.assign({}, prev); c[slug] = val; return c; }); }
    function remove(slug) {
      post("/favorites", { slug: slug, add: false }).then(function (r) { favs[1]((r && r.favorites) || []); }).catch(function () { });
    }
    function install(slug, mk) {
      setInst(slug, { state: "installing", elapsed: 0 });
      post("/install", { slug: slug, market: mk || "clawhub" }).then(function (r) {
        if (!r || !r.ok || !r.job_id) { setInst(slug, { state: "fail", msg: (r && r.error) || "?" }); return; }
        pollInstall(slug, r.job_id);
      }).catch(function (e) { setInst(slug, { state: "fail", msg: String(e) }); });
    }
    function pollInstall(slug, jobId) {
      var tick = function () {
        api("/install_status?id=" + encodeURIComponent(jobId)).then(function (s) {
          if (!s || !s.ok) { setInst(slug, { state: "fail", msg: (s && s.error) || "?" }); return; }
          if (s.state === "done" || s.state === "failed") {
            var res = s.result || {};
            if (s.state === "done" && res.ok) setInst(slug, { state: "ok", msg: (res.version ? "@" + res.version : "") });
            else { var fr = res.friendly || {}; setInst(slug, { state: "fail", msg: (fr.reason || res.error || "?"), fix: fr.fix }); }
            return;
          }
          setInst(slug, { state: "installing", elapsed: s.elapsed_s || 0, stage: s.stage });
          setTimeout(tick, 1000);
        }).catch(function (e) { setInst(slug, { state: "fail", msg: String(e) }); });
      };
      setTimeout(tick, 700);
    }
    function card(f, i) {
      var slug = (f && f.slug) ? f.slug : f;
      var name = (f && f.name) || slug;
      var summary = f && f.summary;
      var url = f && f.url;
      var mk = (f && f.market) || "clawhub";
      var icon = f && f.icon;
      var initial = (name || "?").charAt(0).toUpperCase();
      var stt = inst[0][slug] || {};
      var busy = stt.state === "installing";
      var ok = stt.state === "ok"; var fail = stt.state === "fail";
      return h("div", { key: i, className: "ex-mini" },
        h("div", { className: "ex-mini-head" },
          h("div", { className: "ex-avatar" }, icon ? h("img", { src: icon, onError: function (e) { e.target.style.display = "none"; } }) : initial),
          h("div", { style: { minWidth: 0, flex: 1 } },
            h("div", { className: "ex-mini-title" }, name),
            h("div", { className: "ex-mini-sub" }, mk)),
          h("button", { key: "rm", className: "ex-heart on", title: t("favRemove"), onClick: function () { remove(slug); } }, "♥")),
        summary ? h("div", { className: "ex-mini-desc" }, summary) : null,
        h("div", { className: "ex-mini-foot" }, [
          url ? h("a", { key: "lk", className: "ex-row2-home", href: url, target: "_blank", rel: "noopener noreferrer", title: t("homepage") }, linkIcon()) : h("span", { key: "lk" }, ""),
          h("button", { key: "i", className: "ex-btn ex-btn-solid ex-spacer", title: (fail && stt.msg) ? (stt.msg + (stt.fix ? " — " + stt.fix : "")) : "", onClick: function () { if (!busy) install(slug, mk); }, disabled: busy },
            busy ? (stt.elapsed ? stt.elapsed + "s" : "…") : (ok ? "✓" : (fail ? "✗" : t("install")))),
        ]));
    }
    var list = favs[0];
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-controls", style: { justifyContent: "space-between", marginBottom: ".7rem" } },
        h("div", { className: "ex-section-title", style: { margin: 0 } }, t("myFavorites")),
        h("button", { className: "ex-btn", onClick: load }, t("refresh"))),
      list == null ? h("div", { className: "ex-empty" }, t("loadingStatus")) :
        (list.length === 0 ? h("div", { className: "ex-empty" }, t("favEmpty")) :
          h("div", { className: "ex-mini-grid" }, list.map(card))));
  }

  function RunPanel() {
    var t = useTr();
    var lang = useState("python"); var code = useState("print(6 * 7)");
    var out = useState(null); var busy = useState(false);
    function run() {
      busy[1](true); out[1](null);
      post("/runtime", { lang: lang[0], code: code[0] })
        .then(out[1]).catch(function (e) { out[1]({ ok: false, error: String(e) }); })
        .finally(function () { busy[1](false); });
    }
    var o = out[0];
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-section-title" }, t("runtimeTitle")),
      h("div", { className: "ex-controls" },
        h("select", { key: "l", value: lang[0], onChange: function (e) { lang[1](e.target.value); } },
          ["python", "node", "bash", "ruby", "powershell"].map(function (x) { return h("option", { key: x, value: x }, x); })),
        h("button", { key: "run", className: "ex-btn ex-btn-primary ex-spacer", onClick: run, disabled: busy[0] }, busy[0] ? t("running") : t("run"))),
      h("textarea", { value: code[0], onChange: function (e) { code[1](e.target.value); }, rows: 6, style: { width: "100%", marginTop: ".6rem", fontFamily: "ui-monospace, monospace", fontSize: ".8rem" } }),
      o ? pre(o.ok ? (o.stdout || "") + (o.stderr ? "\n[stderr]\n" + o.stderr : "") : "error: " + (o.error || "?")) : null,
    );
  }

  function AuditPanel() {
    var t = useTr();
    var data = useState(null);
    var tool = useState(""); var status = useState("");
    function load(opts) {
      opts = opts || {};
      var tl = opts.tool != null ? opts.tool : tool[0];
      var stt = opts.status != null ? opts.status : status[0];
      data[1](null);
      var url = "/audit?limit=300" + (tl ? "&tool=" + encodeURIComponent(tl) : "") + (stt ? "&ok=" + stt : "");
      api(url).then(data[1]).catch(function (e) { data[1]({ ok: false, error: String(e) }); });
    }
    useEffect(function () { load(); }, []);
    function fmtTs(ts) { try { return new Date((ts || 0) * 1000).toLocaleString(); } catch (e) { return String(ts); } }
    function exportJson() {
      var recs = (data[0] && data[0].records) || [];
      try {
        var blob = new Blob([JSON.stringify(recs, null, 2)], { type: "application/json" });
        var u = URL.createObjectURL(blob);
        var a = document.createElement("a"); a.href = u; a.download = "omnilimb-audit.json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
      } catch (e) { /* ignore */ }
    }
    var d = data[0];
    if (!d) return h("div", { className: "ex-section" }, h("div", { className: "ex-section-title" }, t("auditTitle")), h("div", { className: "ex-empty" }, t("loadingStatus")));
    if (!d.ok) return h("div", { className: "ex-section" },
      h("div", { className: "ex-section-title" }, t("auditTitle")),
      h("div", { className: "ex-notice" }, d.error || "?"));
    var recs = d.records || [];
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-section-title" }, t("auditTitle") + " (" + recs.length + ")"),
      h("div", { className: "ex-controls" },
        h("select", { key: "tl", value: tool[0], onChange: function (e) { tool[1](e.target.value); load({ tool: e.target.value }); } },
          [h("option", { key: "_a", value: "" }, t("filterTool") + ": " + t("statusAll"))].concat((d.tools || []).map(function (x) { return h("option", { key: x, value: x }, x); }))),
        h("select", { key: "st", value: status[0], onChange: function (e) { status[1](e.target.value); load({ status: e.target.value }); } }, [
          h("option", { key: "a", value: "" }, t("filterStatus") + ": " + t("statusAll")),
          h("option", { key: "o", value: "true" }, t("statusOk")),
          h("option", { key: "f", value: "false" }, t("statusFail")),
        ]),
        h("button", { key: "rf", className: "ex-btn", onClick: function () { load(); } }, t("refresh")),
        h("button", { key: "ex", className: "ex-btn ex-spacer", onClick: exportJson, disabled: recs.length === 0 }, t("export"))),
      !d.enabled ? h("div", { className: "ex-notice", style: { marginTop: ".5rem" } }, t("auditDisabled")) : null,
      recs.length === 0 ? h("div", { className: "ex-empty", style: { marginTop: ".6rem" } }, t("noAudit")) :
        h("div", { style: { marginTop: ".7rem", display: "flex", flexDirection: "column", gap: ".3rem" } }, recs.map(function (r, i) {
          return h("div", { key: i, className: "ex-row" },
            h("span", { key: "ok", className: r.ok ? "ex-status-ok" : "ex-status-bad" }, r.ok ? "✓" : "✗"),
            h("span", { key: "tl", style: { fontWeight: 600 } }, r.tool || "?"),
            r.backend ? h("span", { key: "bk", className: "ex-badge" }, r.backend) : null,
            h("span", { key: "ts", className: "ex-meta" }, fmtTs(r.ts)),
            r.error ? h("span", { key: "er", className: "ex-status-bad", style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" } }, String(r.error)) : null,
          );
        })),
    );
  }

  function SettingsPanel() {
    var t = useTr();
    var cfg = useState(null);
    var form = useState({});
    var msg = useState("");
    var health = useState(null);
    var mkts = useState([]);
    // A: per-skill API-key configuration, moved here from the detail page.
    var installed = useState([]);
    var credSlug = useState("");
    var creds = useState(null);      // {ok, declared, set}
    var credVals = useState({});     // key -> input value
    var credNewKey = useState("");
    var credMsg = useState("");
    var showStats = useState(exShowStats());   // UI-only top stat-card visibility
    function loadCfg() { api("/settings").then(function (r) { cfg[1](r); if (r && r.ok) form[1](Object.assign({}, r.settings)); }).catch(function (e) { cfg[1]({ ok: false, error: String(e) }); }); }
    function loadHealth() { health[1](null); api("/health").then(health[1]).catch(function (e) { health[1]({ ok: false, error: String(e) }); }); }
    useEffect(function () {
      loadCfg(); loadHealth();
      api("/markets").then(function (r) { mkts[1]((r && r.markets) || []); }).catch(function () { });
      api("/installed").then(function (r) { installed[1]((r && r.skills) || []); }).catch(function () { });
    }, []);
    function setF(k, v) { var c = Object.assign({}, form[0]); c[k] = v; form[1](c); }
    function save() {
      msg[1](t("saving"));
      post("/settings", { settings: form[0] })
        .then(function (r) { msg[1](r && r.ok ? t("saved") : (t("saveFail") + ": " + ((r && r.error) || "?"))); loadCfg(); })
        .catch(function (e) { msg[1](t("saveFail") + ": " + String(e)); });
    }
    // --- credentials helpers ---
    function loadCreds(slug) {
      creds[1](null); credVals[1]({}); credNewKey[1](""); credMsg[1]("");
      if (!slug) return;
      api("/skill_credentials?slug=" + encodeURIComponent(slug)).then(creds[1]).catch(function () { creds[1]({ ok: false }); });
    }
    function onPickSkill(slug) { credSlug[1](slug); loadCreds(slug); }
    function setCredVal(k, v) { var c = Object.assign({}, credVals[0]); c[k] = v; credVals[1](c); }
    function saveCred(key, val) {
      credMsg[1](t("saving"));
      post("/skill_credentials", { slug: credSlug[0], key: key, value: val })
        .then(function (r) { credMsg[1](r && r.ok ? t("saved") : t("saveFail")); setCredVal(key, ""); loadCreds(credSlug[0]); })
        .catch(function () { credMsg[1](t("saveFail")); });
    }
    function clearCred(key) { post("/skill_credentials", { slug: credSlug[0], key: key, value: "" }).then(function () { loadCreds(credSlug[0]); }).catch(function () { }); }
    // --- field/control helpers ---
    function toggle(key) {
      return h("label", { className: "ex-switch" }, [
        h("input", { key: "i", type: "checkbox", checked: !!form[0][key], onChange: function (e) { setF(key, e.target.checked); } }),
        h("span", { key: "t", className: "ex-switch-track" }),
      ]);
    }
    function fieldRow(key, label, control, hint) {
      return h("div", { key: key, className: "ex-set-field" }, [
        h("span", { key: "l", className: "ex-set-label" }, label),
        h("div", { key: "c", className: "ex-set-control" }, control),
        hint ? h("div", { key: "h", className: "ex-set-hint" }, hint) : null,
      ]);
    }
    function renderCredSection() {
      var list = installed[0] || [];
      var cv = creds[0];
      var body = null;
      if (credSlug[0] && cv && cv.ok) {
        var declared = cv.declared || []; var setKeys = cv.set || [];
        var keys = declared.slice();
        setKeys.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
        body = h("div", { key: "body", style: { display: "flex", flexDirection: "column", gap: ".4rem", marginTop: ".55rem" } }, [
          keys.length === 0 ? h("div", { key: "n", className: "ex-meta" }, t("credNone")) : null,
          h("div", { key: "rows", style: { display: "flex", flexDirection: "column", gap: ".4rem" } }, keys.map(function (k) {
            var isSet = setKeys.indexOf(k) >= 0;
            return h("div", { key: k, className: "ex-cred-row" }, [
              h("span", { key: "k", className: "ex-cred-key" }, k),
              isSet ? h("span", { key: "b", className: "ex-badge ex-badge-ok" }, "✓ " + t("credSet")) : null,
              h("input", { key: "i", type: "password", className: "ex-cred-input", placeholder: isSet ? "••••••" : t("credValuePh"), value: credVals[0][k] || "", onChange: function (e) { setCredVal(k, e.target.value); } }),
              h("button", { key: "s", className: "ex-btn ex-btn-primary", onClick: function () { saveCred(k, credVals[0][k] || ""); } }, t("credSave")),
              isSet ? h("button", { key: "c", className: "ex-btn ex-btn-danger", onClick: function () { clearCred(k); } }, t("credClear")) : null,
            ]);
          })),
          h("div", { key: "add", className: "ex-cred-row" }, [
            h("input", { key: "nk", className: "ex-cred-input", placeholder: t("credKeyPh"), value: credNewKey[0], onChange: function (e) { credNewKey[1](e.target.value); } }),
            h("input", { key: "nv", type: "password", className: "ex-cred-input", placeholder: t("credValuePh"), value: credVals[0]["__new"] || "", onChange: function (e) { setCredVal("__new", e.target.value); } }),
            h("button", { key: "a", className: "ex-btn", onClick: function () { var k = (credNewKey[0] || "").trim(); if (!k) return; saveCred(k, credVals[0]["__new"] || ""); credNewKey[1](""); setCredVal("__new", ""); } }, t("credAdd")),
          ]),
          credMsg[0] ? h("div", { key: "m", className: "ex-meta" }, credMsg[0]) : null,
        ]);
      }
      return h("div", { className: "ex-runs", style: { marginTop: ".8rem" } }, [
        h("div", { key: "h", className: "ex-runs-title" }, "🔑 " + t("credSkillTitle")),
        h("div", { key: "hint", className: "ex-meta", style: { marginBottom: ".5rem", lineHeight: 1.5 } }, t("credSectionHint")),
        list.length === 0 ? h("div", { key: "none", className: "ex-meta" }, t("noInstalled")) :
          h("select", { key: "pick", className: "ex-cred-input", style: { flex: "0 0 auto", minWidth: "18rem", maxWidth: "100%" }, value: credSlug[0], onChange: function (e) { onPickSkill(e.target.value); } },
            [h("option", { key: "_", value: "" }, t("credSkillPickPh"))].concat(list.map(function (sk) {
              var slug = sk.slug || sk.name; return h("option", { key: slug, value: slug }, sk.displayName || slug);
            }))),
        body,
      ]);
    }
    var hv = health[0];
    var marketOpts = ((mkts[0] && mkts[0].length) ? mkts[0] : [{ id: "clawhub", label: "ClawHub" }, { id: "skillhub", label: "SkillHub.cn" }]);
    return h("div", { className: "ex-section" },
      h("div", { className: "ex-section-title" }, t("settingsTitle")),
      null,
      !cfg[0] ? h("div", { className: "ex-empty" }, t("loadingStatus")) :
        h("div", { className: "ex-set-form" }, [
          fieldRow("showstats", t("fieldShowStats"),
            h("label", { className: "ex-switch" }, [
              h("input", { key: "i", type: "checkbox", checked: showStats[0], onChange: function (e) { var v = e.target.checked; showStats[1](v); exSetShowStats(v); } }),
              h("span", { key: "t", className: "ex-switch-track" }),
            ]),
            t("showStatsHint")),
          fieldRow("backend", t("statBackend"),
            h("select", { value: form[0].backend || "auto", onChange: function (e) { setF("backend", e.target.value); } },
              [["auto", "auto"], ["cli", "cli"], ["native", "native"]].map(function (o) { return h("option", { key: o[0], value: o[0] }, o[1]); })),
            t("backendHint")),
          fieldRow("market", t("defaultMarket"),
            h("select", { value: form[0].market || "clawhub", onChange: function (e) { setF("market", e.target.value); } },
              marketOpts.map(function (m) { return h("option", { key: m.id, value: m.id }, m.label || m.id); })),
            t("marketHint")),
          fieldRow("audit_log", t("fieldAudit"), toggle("audit_log"), t("auditHint")),
          fieldRow("cache_enabled", t("fieldCache"), toggle("cache_enabled"), t("cacheHint")),
          fieldRow("ttl", t("fieldTtl"),
            h("input", { type: "number", className: "ex-cred-input", style: { maxWidth: "10rem" }, value: form[0].discover_ttl_s || 0, onChange: function (e) { setF("discover_ttl_s", parseInt(e.target.value || "0", 10)); } }),
            t("ttlHint")),
          fieldRow("ws", t("workspace"),
            h("input", { className: "ex-cred-input", placeholder: "~/.openclaw/workspace", value: form[0].workspace || "", onChange: function (e) { setF("workspace", e.target.value); } }),
            t("workspaceHint")),
          h("div", { key: "sv", className: "ex-set-save", style: { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: ".6rem", flexWrap: "wrap" } }, [
            msg[0] ? h("span", { key: "m", className: "ex-meta" }, msg[0] + " · " + t("needRestart")) : null,
            h("button", { key: "b", className: "ex-btn ex-btn-primary", onClick: save }, t("save")),
          ]),
        ]),
      renderCredSection(),
      h("div", { className: "ex-runs", style: { marginTop: ".8rem" } }, [
        h("div", { key: "h", className: "ex-runs-title", style: { display: "flex", alignItems: "center", gap: ".5rem" } }, [
          h("span", { key: "t" }, t("diagTitle")),
          h("button", { key: "r", className: "ex-btn", onClick: loadHealth }, t("recheck")),
        ]),
        !hv ? h("div", { key: "l", className: "ex-meta" }, "…") :
          (!hv.ok ? h("div", { key: "e", className: "ex-status-bad" }, hv.error || "?") :
            h("div", { key: "c", style: { display: "flex", flexDirection: "column", gap: ".25rem" } }, (hv.checks || []).map(function (c, i) {
              return h("div", { key: i, className: "ex-run-row" }, [
                h("span", { key: "ok", className: c.ok ? "ex-status-ok" : "ex-status-bad" }, c.ok ? "✓" : "✗"),
                h("span", { key: "n", className: "ex-run-entry" }, c.name),
                h("span", { key: "d", className: "ex-meta" }, c.detail || ""),
              ]);
            }))),
      ]));
  }

  // ============================================================ Converted (1.0)
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

  // ============================================================ Steward terminal (1.0)
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

  // ============================================================ Steward (1.0)
  function Steward() {
    var L = useL();
    var sb = useState("butler"), sub = sb[0], setSub = sb[1];
    var rs = useState(null), result = rs[0], setResult = rs[1];
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
        e("div", { className: "flex flex-wrap gap-1 border-b border-border pb-2" }, subs.map(function (tt) {
          var onx = tt[0] === sub;
          return e("button", { key: tt[0], onClick: function () { setSub(tt[0]); },
            className: cn("rounded-md px-3 py-1.5 text-sm transition-colors",
              onx ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted") }, tt[1]);
        })),
        sub === "learn" ? e(Card, null, e(CardContent, { className: "p-3" }, e(Learn, null))) : butler));
  }

  function OmnilimbPanel() {
    var t = useTr();
    var L = useL();
    var tab = useState("search");
    // User-facing tabs. Audit is a FREE feature (everyone can view). "Runtime"
    // (a developer code bench) stays hidden from the UI — re-enable by adding
    // ["runtime", t("tabRuntime")] back to this list.
    var tabs = [["search", t("tabSearch")], ["installed", t("tabInstalled")], ["converted", L.tabConverted]];
    tabs = tabs.concat([["favorites", t("tabFavorites")], ["audit", t("tabAudit")], ["steward", L.tabSteward], ["settings", t("tabSettings")]]);
    // Listen for cross-component tab-navigation requests and switch tabs.
    useEffect(function () {
      var on = function (e) { var dst = e && e.detail; if (dst) tab[1](dst); };
      window.addEventListener("omnilimb:gototab", on);
      return function () {
        window.removeEventListener("omnilimb:gototab", on);
      };
    }, []);
    return h("div", { className: "ex-page omnilimb-panel p-4" },
      h(TopBar, null),
      h("div", { className: "ex-tabs" }, tabs.map(function (tb) {
        return h("button", { key: tb[0], onClick: function () { tab[1](tb[0]); }, className: (tab[0] === tb[0] ? "active" : "") }, tb[1]);
      })),
      tab[0] === "search" ? h(SearchPanel, null) : null,
      tab[0] === "installed" ? h(InstalledPanel, null) : null,
      tab[0] === "converted" ? h(Converted, null) : null,
      tab[0] === "favorites" ? h(FavoritesPanel, null) : null,
      tab[0] === "runtime" ? h(RunPanel, null) : null,
      tab[0] === "audit" ? h(AuditPanel, null) : null,
      tab[0] === "steward" ? h(Steward, null) : null,
      tab[0] === "settings" ? h(SettingsPanel, null) : null,
    );
  }

  window.__HERMES_PLUGINS__.register("omnilimb", OmnilimbPanel);
})();
