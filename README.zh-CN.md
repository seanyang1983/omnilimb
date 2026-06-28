<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/banner-zh.svg" alt="Omnilimb — 给你的 Hermes 智能体装上手和脚" width="100%" />
</p>

<p align="center">
  <a href="https://pypi.org/project/omnilimb/"><img alt="PyPI" src="https://img.shields.io/pypi/v/omnilimb.svg?color=5b8cff"></a>
  <a href="https://pepy.tech/project/omnilimb"><img alt="Downloads" src="https://static.pepy.tech/badge/omnilimb"></a>
  <a href="https://github.com/seanyang1983/omnilimb/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/seanyang1983/omnilimb?color=36e0c0&label=stars"></a>
  <a href="https://github.com/seanyang1983/omnilimb/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-36e0c0.svg"></a>
  <img alt="Python" src="https://img.shields.io/badge/Python-3.10%2B-5b8cff.svg">
  <img alt="Status" src="https://img.shields.io/badge/v1.0-all%20features%20free-5b8cff.svg">
  <img alt="Tokens" src="https://img.shields.io/badge/execution%20path-0%20extra%20LLM%20tokens-36e0c0.svg">
  <a href="https://www.omnilimb.com"><img alt="Website" src="https://img.shields.io/badge/web-omnilimb.com-9aa4be.svg"></a>
</p>

<p align="center">
  <a href="https://github.com/seanyang1983/omnilimb/blob/main/README.md">English</a> · <b>简体中文</b>
  &nbsp;|&nbsp; 🌐 <a href="https://www.omnilimb.com">omnilimb.com</a>
</p>

# Omnilimb

**你的 Hermes 智能体是大脑,Omnilimb 是它的手和脚。**

为最新的 **Hermes Agent(v0.17.0)** 打造,Omnilimb 是一个 Hermes 插件,让智能体
能够*查找、安装、运行和管理* [OpenClaw / ClawHub](https://clawhub.ai) 社区技能,
还为它配上隔离沙箱、真实的 Playwright 浏览器和多语言运行时。每一项能力都暴露为一个
小巧、**确定性的结构化 JSON 工具**,由智能体直接调用——因此**执行路径上零额外 LLM
token**,不会再起一个"二级智能体循环"去烧你的预算。

1.0 新增:**学习技能(Learn)**——把 Omnilimb 指向任意来源,它就为你蒸馏出一个原生
Hermes 技能。可在仪表盘的可视化 **`/learn`** 表单里操作,或直接用大白话对智能体说
**"学习 &lt;某样东西&gt;"**。

> ℹ️ 兼容 OpenClaw 与 ClawHub,但与其无官方关联。
> "Omnilimb" 是独立产品([omnilimb.com](https://www.omnilimb.com))。

```bash
pip install omnilimb        # 然后:hermes plugins enable omnilimb
```

---

## 为什么用 Omnilimb

- ⚡ **零 token 开销。** 执行路径从不调用模型。智能体只决策*一次*,Omnilimb
  确定性地把活干完,再把 JSON 结果交回去。
- 🧰 **一整套工具箱,只有一个小接口。** 发现、安装、运行、沙箱、浏览器、运行时
  ——再加上技能 → 原生 Hermes 转换与开放进料学习——没有庞杂的 API 要学。
- 🛡️ **默认安全。** 第三方技能在 Docker 沙箱中运行,默认关闭网络并自动回滚。
  路径穿越与 zip-slip 均有防护。
- 🔌 **无锁定、不回传。** 搜索只与你选定的市场通信;你的代码、缓存和审计日志
  都留在本机。
- 🪶 **有没有 Node 都能跑。** `native` 后端是纯 Python;`cli` 后端桥接真实的
  `openclaw` / `clawhub` 命令以获得完整一致性。
- 🌐 **市场任你接。** ClawHub、SkillHub、官方国内镜像、GitHub 技能索引——或者
  几行代码加一个你自己的适配器。

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/architecture-zh.svg" alt="Omnilimb 架构:Hermes 大脑 → Omnilimb 确定性工具 → 技能/沙箱/浏览器/运行时" width="100%" />
</p>

## 工具一览

**1.0 起全部工具免费**——无分层、无许可。Omnilimb 向智能体注册以下结构化 JSON 工具:

| 工具 | 作用 |
|------|------|
| `claw_skill_search` | 搜索 ClawHub / SkillHub 市场 |
| `claw_skill_install` | 安装 + 校验技能(slug / `git:owner/repo@ref` / 本地路径) |
| `claw_skill_run` | 确定性运行技能的脚本入口 |
| `claw_sandbox_exec` | 在隔离 (Docker) 沙箱中运行命令,支持回滚 |
| `claw_browser` | 用结构化动作列表驱动 Playwright 浏览器 |
| `claw_runtime` | 快速运行 python / node / bash / ruby / go 片段 |
| `claw_skill_list` | 列出本机已安装技能及其来源 |
| `claw_skill_runs` | 已安装技能的运行历史(诊断) |
| `claw_skill_to_hermes` | 把已安装技能转换成原生 Hermes 技能(确定性 / AI 策展) |
| `claw_skill_learn` | 从**任意来源**(路径 / URL / 粘贴文本)蒸馏原生 Hermes 技能(开放进料版 `/learn`) |
| `claw_pack_list` / `claw_pack_install` | 浏览并安装精选、经审核的技能包 |
| `claw_skill_update` | 重新解析并重装过期的市场技能 |

<p align="center">
  <img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/tools-zh.svg" alt="Omnilimb 的结构化 JSON 工具,由智能体直接调用" width="100%" />
</p>

## 转换与学习 —— 把任何东西变成原生 Hermes 技能

两个免费工具让你从「找到技能」一步到「Hermes 原生拥有它」:

- **`claw_skill_to_hermes`** 把已安装的市场技能转换成原生 Hermes 技能,写入
  `<HERMES_HOME>/skills/<name>/`。可选 `deterministic`(纯离线、可复现)或
  `ai_curated`(用配置的 OpenAI 兼容模型重写文档,失败自动回退确定性)。
- **`claw_skill_learn`** 把进料拓宽到**任意来源**——本地路径、URL、粘贴的文本/
  笔记——并据此撰写原生技能。这就是开放进料版的 `/learn`。

两者都走结构**校验循环**、**事务写入**、且**幂等**(来源没变重复运行是空操作,
按来源哈希匹配)。产物落在 `<HERMES_HOME>/skills/<name>/`,像任何原生技能一样加载。
**学习技能**可在仪表盘的可视化 **技能管家 → 学习技能(`/learn`)** 表单里操作,或直接
用大白话对智能体说——*"learn &lt;来源&gt;"* / *"学习 &lt;来源&gt;"*。所有转换或学习
得到的技能都会一起出现在仪表盘的 **我的技能** 库里,并带「转换 / 学习」来源标签。

## 快速开始

**作为 pip 包安装:**

```bash
pip install omnilimb               # 核心
pip install "omnilimb[browser]"    # + Playwright
playwright install chromium        # 一次性下载浏览器
hermes plugins enable omnilimb
```

**作为目录插件(最简单):**

```bash
cp -r omnilimb ~/.hermes/plugins/omnilimb
hermes plugins enable omnilimb
```

在会话中验证:

```
/exo doctor
```

### 本地试玩 —— 无需 Hermes、无需 GUI

这个插件是一个无界面引擎;*感受*它的方式就是调用它的工具、看返回的 JSON:

```bash
python scripts/demo.py doctor                  # 后端状态
python scripts/demo.py search github 5         # 实时 ClawHub 搜索
python scripts/demo.py runtime python "print(6*7)"
python scripts/demo.py sandbox "echo hi"
python scripts/demo.py menu                    # 交互式
```

## 选择市场

用 `omnilimb.market`(或 `OMNILIMB_MARKET`)切换技能市场:

| 市场 | 来源 | 说明 |
|------|------|------|
| `clawhub`(默认) | clawhub.ai | 官方 OpenClaw 注册中心,HTTP API v1 |
| `skillhub` | api.skillhub.cn | 国内市场;服务端搜索、公开 zip 下载 |
| `clawhub-cn` | mirror-cn.clawhub.com | 官方国内镜像(火山引擎) |
| `skillsmp` | skillsmp.com | GitHub 托管的技能索引 |

可在 `~/.hermes/config.yaml` 的 `omnilimb.markets` 下添加更多市场(每个为
`{id, type, base_url, label}`,`type` 取值 `clawhub | skillhub | clawhub_mirror | skillsmp`)。
在 `omnilimb/registries.py` 加一个适配器类即可支持新类型市场。

## 选择后端

在 `~/.hermes/config.yaml` 设置 `omnilimb.backend`(或 `OMNILIMB_BACKEND`):

| 模式 | 行为 |
|------|------|
| `cli` | 桥接真实的 `openclaw` / `clawhub` CLI,市场一致性最佳。需要 Node + OpenClaw。 |
| `native` | 完全脱钩的 Python 底座。无需 Node。原生处理沙箱/浏览器/运行时 + `git:`/本地安装。 |
| `auto`(默认) | PATH 上有 `openclaw` 则用 `cli`,否则用 `native`。 |

## 仪表盘 UI(可选)

`dashboard/` 内含一个零依赖的 Web UI(已按 v0.17.0 插件 SDK 重建;中英文双语)。
启用插件并重启 `hermes dashboard` 后,会在 *技能* 之后出现一个 **Omnilimb** 标签页,
内含以下子标签:

- **技能管家** —— 默认视图:一个确定性(**不调大模型**)的管家,用快捷动作或直接
  打命令为你体检、推荐、诊断技能(还能扫审计日志),并内置**学习技能(从任意来源
  学习)**表单。
- **搜索** —— 跨市场发现,外加**发现**模式(推荐 / 上升 / 热门 / 最新 榜单 + 分类
  筛选)、单技能体检评分,以及一键 **全部体检** —— 安装*前*就给每条结果 0–100 分+评级。
- **已安装** —— 每个技能可展开详情:体检评分、就绪检查(命令 + API Key)、凭据、
  `SKILL.md` 查看/编辑、冒烟测试、一键 **更新**(带实时进度)、**→ Hermes** 转换、
  以及导入/导出。
- **我的技能** —— 把你**转换与学习**得到的原生技能汇集到一个库,按来源标注
  (转换 / 学习),带前置元数据查看与受保护卸载。
- **收藏** —— 收藏的技能。
- **审查** —— 可选的 JSONL 审计日志。
- **设置** —— 后端 / 市场 / 沙箱 / 缓存 / 路径,底部带紧凑概览。

UI 会自动跟随当前仪表盘的主题与语言。

### 实际效果

来自 Omnilimb 仪表盘标签页的真实截图 —— 确定性技能管家、带一键**全部体检**的市场
搜索、已安装技能管理,以及**学习技能** 表单(点击任意图片放大):

<table>
<tr>
<td width="50%" valign="top"><a href="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-steward-zh.jpg"><img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-steward-zh.jpg" alt="技能管家"/></a><br/><sub><b>技能管家</b> —— 确定性(不调大模型)的管家:体检、推荐、诊断,外加学习技能。</sub></td>
<td width="50%" valign="top"><a href="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-search-zh.jpg"><img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-search-zh.jpg" alt="跨市场搜索与一键全部体检"/></a><br/><sub><b>搜索</b> —— 一键「全部体检」,安装前给每条结果 0–100 分+评级。</sub></td>
</tr>
<tr>
<td width="50%" valign="top"><a href="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-installed-zh.jpg"><img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-installed-zh.jpg" alt="已安装技能管理"/></a><br/><sub><b>已安装</b> —— 体检、凭据、冒烟测试,外加「更新」和「→ Hermes 转换」。</sub></td>
<td width="50%" valign="top"><a href="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-learn-zh.jpg"><img src="https://cdn.jsdelivr.net/gh/seanyang1983/omnilimb@e09a7820578083b6d906ee8549461da809d2c233/docs/assets/ui-learn-zh.jpg" alt="从任意来源学习原生 Hermes 技能"/></a><br/><sub><b>学习技能</b> —— 从路径、URL 或粘贴文本蒸馏出原生 Hermes 技能。</sub></td>
</tr>
</table>

> 🌐 项目站点:**[omnilimb.com](https://www.omnilimb.com)**

## 配置(`~/.hermes/config.yaml`)

```yaml
omnilimb:
  backend: auto            # auto | cli | native
  market: clawhub          # clawhub | skillhub | clawhub-cn | skillsmp
  sandbox_enabled: true
  sandbox_image: "python:3.12-slim"
  sandbox_network: false
  default_timeout_s: 120
  max_retries: 2
  rollback: true
  registry_base_url: "https://clawhub.ai"
  browser_headless: true
  audit_log: false         # 记录工具调用的 JSONL 审计日志
  cache_enabled: true      # 本地 SQLite 缓存,用于发现 + 搜索回退
  discover_ttl_s: 21600    # 发现榜单缓存 TTL(6 小时)
  cache_max_age_s: 604800  # 离线搜索回退的最大陈旧期(7 天)
```

从仪表盘 **Settings** 改动的设置会写入独立的覆盖文件(`omnilimb.overrides.json`),
绝不写你手写的 `config.yaml`。解析优先级为 `env > overrides > config.yaml`。

## 安全

第三方技能是不可信代码。对不完全信任的东西,优先用 `claw_sandbox_exec` 并设
`network: false`。没有 Docker 时,沙箱调用在本地运行并标记 `"sandboxed": false`。
技能文件操作与卸载有路径穿越防护;压缩包解压有 zip-slip 防护。漏洞上报见
[`SECURITY.md`](https://github.com/seanyang1983/omnilimb/blob/main/SECURITY.md)。

## 开发

```bash
pip install -e ".[dev,browser]"
pytest -q
```

架构规则(插件从不导入或修改 Hermes 核心,每个处理函数返回 JSON 且从不抛异常)、
以及如何添加市场或后端,见 [`CONTRIBUTING.md`](https://github.com/seanyang1983/omnilimb/blob/main/CONTRIBUTING.md)。

## 许可

> **开放 1.0 —— 每个工具和仪表盘功能都免费,采用 MIT。** 没有付费层,无需购买
> 许可。(可选的 Ed25519 许可机制保留但休眠,仅当下游构建显式设置
> `OMNILIMB_ENFORCE_LICENSE=1` 时才会重新启用。)

本仓库即完整版:技能发现 / 安装 / 运行 / 沙箱 / 浏览器 / 运行时,**外加**技能 →
原生 Hermes 转换(确定性 + AI 策展)、开放进料 `claw_skill_learn`、精选包、
自动更新,以及完整仪表盘(含技能管家控制台)。

MIT —— 见 [`LICENSE`](https://github.com/seanyang1983/omnilimb/blob/main/LICENSE)。与 OpenClaw / ClawHub 无官方关联。
