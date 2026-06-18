---
name: paper-acquisition-anti-scrape
description: "学术论文全文获取，含真实浏览器反爬策略：TLS 指纹绕过、Cloudflare Turnstile 应对、
出版商 SSO/CARSI/OpenAthens/WebVPN 机构登录、Cookie 持久化、下载限速与冷却管理。
TRIGGER: 下载论文、获取 PDF、全文获取、文献原文、下论文、paper download、反爬、浏览器下载、
机构登录、paywall bypass、sci-hub 无法下载、文献获取、批量下全文。"
---

# Paper Acquisition Anti-Scrape — 学术论文全文获取（含反爬策略）

## 概述

将 `scansci-pdf` MCP 服务的多源并行下载能力与真实浏览器反爬策略相结合。
**先快后稳**：优先 OA 源和合法渠道快速获取，失败时降级到浏览器引擎兜底。

## 核心理念

- **先快后稳**：优先 `scansci-pdf` 轻量 HTTP 并行下载，失败后降级到浏览器
- **浏览器兜底**：当 Cloudflare、TLS 指纹检测、出版商风控拦截时，通过真实浏览器获取
- **登录一次，多篇受益**：一次 SSO/CARSI/WebVPN 登录持久化 Cookie，同出版商后续自动复用
- **限速冷却**：防触发出版商风控

## 工作流

### Step 1：搜索与确认 DOI

用户给标题、关键词或 DOI 列表时，先搜索：

```
scansci_pdf_search(query="theranostics PSMA", limit=10, sort="cited_by_count")
scansci_pdf_parse_list(file_path="papers.md")
```

让用户选择后再下载，不要自动全量下载。

### Step 2：快速下载（首选路径）

```
# 单篇
scansci_pdf_download(identifier="10.xxxx/xxxxx", strategy="fastest")
scansci_pdf_download(identifier="10.xxxx/xxxxx", strategy="fastest", bibtex=true)

# OA/合法来源限定
scansci_pdf_download(identifier="10.xxxx/xxxxx", strategy="legal_only")

# 批量
scansci_pdf_batch_download(identifiers=["doi1", "doi2", "doi3"])

# 列表文件
scansci_pdf_resolve_and_download(file_path="papers.md", resolve_titles=true)
scansci_pdf_import_bib(bib_file="library.bib")
```

**成功** → 返回 PDF 路径。**失败**（返回 `paywall` / `human_verification_required` / `403`） → 走 Step 3。

### Step 3：机构 SSO 登录（paywall 专用）

#### 方案 A：通用登录（推荐）

```
1. scansci_pdf_login(identifier="10.xxxx/xxxxx")
   → 自动打开浏览器到论文页面
   → 引导用户："点击 Access through your institution → 选择机构 → 完成 SSO 登录 → 关闭浏览器"

2. 登录完成后 Cookie 自动持久化
3. 重试下载
   scansci_pdf_download(identifier="10.xxxx/xxxxx")
```

**支持 SSO 类型**：CARSI（中国教育网联邦）、OpenAthens、Shibboleth
**支持出版商**：elsevier, wiley, springer, nature, science, ieee, tandfonline, pnas, acs, rsc, aip, aps, iop, oxford, acm

#### 方案 B：WebVPN（中国高校推荐）

```
1. scansci_pdf_vpnsci_set_school(school="清华大学")  # 搜学校
2. scansci_pdf_config_set(key="vpnsci_enabled", value="true")
3. scansci_pdf_vpnsci_login      # 浏览器 CAS 登录
4. scansci_pdf_vpnsci_test       # 验证连通性
5. scansci_pdf_download(identifier="...", use_vpnsci=true)
```

#### 方案 C：EZProxy（图书馆代理）

```
scansci_pdf_config_set(key="ezproxy_enabled", value="true")
scansci_pdf_config_set(key="ezproxy_login_url",
  value="https://libproxy.你的学校.edu.cn/login?url={url}")
scansci_pdf_ezproxy_login
scansci_pdf_ezproxy_status
```

### Step 4：浏览器兜底（当普通下载 + SSO 仍失败时）

如果 Step 3 之后仍然报 `403`、`human_verification_required`、或 TLS 指纹错误，
说明出版商的 PDF 交付链路需要真实浏览器。

运行提供的浏览器脚本（见 `scripts/browser-fallback.js`）：

```bash
node scripts/browser-fallback.js "10.xxxx/xxxxx"
```

该脚本使用公开的 `puppeteer-core` 连接本地 Chrome，自动完成：
1. 连接 Chrome DevTools 端口（默认 `http://127.0.0.1:9222`）
2. 从 `doi.org` 解析到出版商着陆页
3. 自动检测 PDF 链接（支持主流出版商）
4. 通过 CDP 协议下载 PDF 二进制

**前置条件**（一次性配置）：

```bash
# 1. 安装 Chrome / Chromium
# 2. 安装 Node.js + puppeteer-core
npm install puppeteer-core

# 3. 启动 Chrome 开放远程调试
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"

# macOS
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"

# 4. 验证 CDP 可达
curl -s http://127.0.0.1:9222/json/version
```

## 反爬策略详解

### 1. TLS 指纹绕过（核心原理）

出版商的 CDN（Cloudflare、Akamai）会检测 HTTP 客户端的 TLS 握手指纹（JA3/JA3S）。
即使持有有效 Cookie，Python 的 `requests` / `httpx` 因为 TLS 指纹与真实浏览器不同，
仍可能返回 `403` 或触发人机验证。

**关键结论**：PDF 必须通过真实浏览器下载。

`scansci-pdf` 使用的 CloakBrowser 引擎伪造了以下指纹以匹配真实浏览器：
- TLS 指纹（JA3/JA3S 哈希）
- WebGL 渲染器指纹
- Canvas 指纹
- AudioContext 指纹
- 字体列表
- 屏幕分辨率与色深
- 时区与语言

### 2. 代理与 IP 轮换

```
# Tor 匿名下载（scansci-pdf 内置）
scansci_pdf_tor_install    # 首次安装 Tor 二进制
scansci_pdf_tor_start      # 启动 Tor SOCKS5 代理
scansci_pdf_download(identifier="...", use_tor=true)

# 受限网络（防火墙封锁 Tor），启用 obfs4 桥接
scansci_pdf_tor_start(use_bridges=true)

# 全局 HTTP/SOCKS5 代理
scansci_pdf_config_set(key="network_proxy", value="socks5://127.0.0.1:1080")
```

### 3. 限速与冷却

**核心原则**：同一出版商的下载请求必须限速，触发验证后立即冷却。

| 事件 | 同桶下一次请求等待时间 |
|------|----------------------|
| 下载成功 | 45-90 秒（随机抖动） |
| PDF 未找到 / DOI 未解析 | 15-30 秒 |
| 网络超时或瞬时失败 | 90-180 秒 |
| 403 / 可疑流量 / 出版商封锁 | 10-15 分钟 |
| **人机验证或 CAPTCHA** | **30-60 分钟，禁止自动重试** |
| 同桶连续 3 次失败 | 10-15 分钟 + 更换路由 |

**桶键** = `提供商 + 代理/网络出口 + 登录 profile`

```
示例：
  elsevier + campus-webvpn + ~/.scansci-pdf/vpnsci
  wiley + tor-exit + ~/.openclaw/browser-clone
  springer + direct-network + no-login
```

**并发限制**：
- 全局浏览器下载并发：最多 1
- 同出版商并发：最多 1
- 同登录 profile 并发：最多 1

**重试规则**：
- `paywall` / `login_required` → 不盲目重试，需要先改变登录状态
- `human_verification_required` → **严禁自动重试**，冷却 30-60 分钟后手动介入
- 暂态网络错误 → 冷却后重试 1 次
- 同一批批量任务中标记失败项目，不要在同一桶中反复重试

### 4. Cookie 持久化

```
# scansci-pdf 自动管理以下位置的登录态
~/.scansci-pdf/camofox/        # Camofox 持久化浏览器
~/.scansci-pdf/vpnsci/         # WebVPN 会话
~/.scansci-pdf/ezproxy/        # EZProxy 登录
~/.openclaw/browser-clone/Default  # 浏览器用户数据

# 手动导入 cookies
scansci_pdf_import_browser_cookies(url="https://www.sciencedirect.com")
scansci_pdf_camofox_import_cookies(cookie_file="/path/to/cookies.txt")
```

## 实际案例

### 案例 1：付费论文，需要机构权限

```
用户：帮我下一篇文章 10.1126/science.aec6396

1. scansci_pdf_download(identifier="10.1126/science.aec6396")
   → {"success": false, "error_type": "paywall", "action": "login_required"}

2. scansci_pdf_login(identifier="10.1126/science.aec6396")
   → 浏览器打开 Science 页面
   → 用户点击 Access through your institution → 选择机构 → SSO → 关闭浏览器
   → Cookie 自动保存

3. scansci_pdf_download(identifier="10.1126/science.aec6396")
   → 成功下载 PDF
```

### 案例 2：文献检索 + 批量下载

```
1. scansci_pdf_search(query="PSMA theranostics prostate cancer", year_from=2023, limit=10, sort="cited_by_count")
2. 用户选择 5 篇
3. scansci_pdf_batch_download(identifiers=["doi1", "doi2", ...])
4. 遇到 paywall → 按案例 1 流程登录后重试
```

## 故障排查

### 诊断命令
```
scansci_pdf_network_diagnose    # DNS / 代理 / Tor 全链路
scansci_pdf_setup_check         # 环境完整性
scansci_pdf_health_check        # 数据源可用性
scansci_pdf_source_scores       # 各下载源健康分
```

### 常见失败原因

| 失败状态 | 原因 | 处理 |
|----------|------|------|
| `paywall` | 需要机构权限 | 运行 SSO 登录流程 |
| `human_verification_required` | Cloudflare / 出版商风控 | 冷却 30-60 分钟，换 IP/代理 |
| `403` via Python HTTP | TLS 指纹被检测 | 必须使用浏览器下载 |
| `download_failed` | 浏览器未正确捕获 | 检查 CDP 端口和浏览器状态 |
| `no_pdf_link_found` | 页面没有 PDF 链接 | 可能非论文页面 |
| `article_unavailable` | DOI 不存在或页面下架 | 确认 DOI 是否正确 |

## 配置参考

### 推荐配置项

```
# 下载策略（fastest / oa_first / scihub_only / legal_only）
scansci_pdf_config_set(key="download_strategy", value="fastest")

# 并发下载数（批量时）
scansci_pdf_config_set(key="batch_workers", value="5")

# 自动重命名（作者+标题）
scansci_pdf_config_set(key="auto_rename", value="true")

# 请求延迟（防风控，单位秒）
scansci_pdf_config_set(key="request_delay_min", value="2")
scansci_pdf_config_set(key="request_delay_max", value="5")

# Elsevier API Key（免费申请，配置后 ScienceDirect 下载快 10-30 倍）
scansci_pdf_elsevier_setup     # 打开浏览器引导申请
scansci_pdf_config_set(key="elsevier_api_key", value="你的Key")
```

## 能力边界

| 需求 | 可复现性 | 说明 |
|------|---------|------|
| 下载 OA 论文 | ✅ 秒级 | 零配置可用 |
| 下载付费论文（有机构权限） | ✅ | SSO 登录一次即可 |
| 下载付费论文（无机构权限） | ⚠️ 部分 | Sci-Hub / LibGen，法律风险自负 |
| 批量下载 100+ 篇 | ✅ 有限速 | 配置 batch_workers + 冷却管理 |
| 阅读 / 翻译 PDF | ❌ | 需配合 PDF 阅读工具 |
| 绕过所有出版商风控 | ⚠️ | 取决于 IP 信誉度和代理质量 |

## 安装要求

### 必需
```
pip install scansci-pdf
```
然后在 `gateway.yaml` 配置 MCP server。

### 可选：浏览器兜底
```
npm install puppeteer-core
```
+ Chrome / Chromium 浏览器 + 开启远程调试端口。
