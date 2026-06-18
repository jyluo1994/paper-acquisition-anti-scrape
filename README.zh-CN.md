# Paper Acquisition Anti-Scrape Skill

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh-CN.md"><strong>中文</strong></a>
</p>

<p align="center">
  <img alt="OpenClaw/Codex Skill" src="https://img.shields.io/badge/OpenClaw%2FCodex-skill-2563eb">
  <img alt="MCP scansci-pdf" src="https://img.shields.io/badge/MCP-scansci--pdf-059669">
</p>

这是一个面向 OpenClaw/Codex 的学术论文 PDF 获取 skill。它采用“开放获取优先”的流程：先用 `scansci-pdf` 快速检索/下载；遇到出版商页面需要登录、浏览器会话或浏览器专属 PDF 下载时，再切换到授权机构登录和真实浏览器兜底。

这个仓库本身就是 skill 目录。把它 clone 到本地 `skills/` 目录，并保持目录名为 `paper-acquisition-anti-scrape` 即可。

## 一眼看懂

| 需求 | 路线 |
| --- | --- |
| 快速下载 DOI/arXiv PDF | `scansci-pdf` MCP |
| 有机构权限但遇到 paywall | SSO/CARSI/OpenAthens/WebVPN/EZProxy 登录 |
| 出版商要求浏览器内下载 PDF | Chrome CDP + browser-probe 脚本 |
| 批量下载且避免触发风控 | 按出版商分桶冷却和重试 |

## 目录

- [快速安装](#快速安装)
- [必需依赖：scansci-pdf MCP](#必需依赖scansci-pdf-mcp)
- [可选：浏览器兜底](#可选浏览器兜底)
- [常用工作流](#常用工作流)
- [故障排查](#故障排查)
- [安全与隐私](#安全与隐私)

## 功能

- 从 DOI、DOI URL、arXiv ID、标题列表或 BibTeX 获取学术 PDF。
- 优先使用开放获取和合法/授权来源。
- 使用 `scansci-pdf` MCP 处理快速检索、引用导出、WebVPN、Tor 和批量下载。
- 当出版商页面需要 Chrome/CDP、SSO cookie 或浏览器专属 PDF 链路时，使用浏览器兜底。
- 为出版商限速、人机验证和批量任务提供冷却规则。
- skill 内不包含私人数据：没有 cookie、浏览器 profile、凭据、API key 或机构会话。

## 快速安装

选择你的 OpenClaw/Codex 工作区使用的 skills 目录。

常见位置：

```bash
~/.openclaw/workspace/skills
~/.codex/skills
```

直接 clone 到该目录：

```bash
mkdir -p ~/.openclaw/workspace/skills
git clone https://github.com/jyluo1994/paper-acquisition-anti-scrape.git \
  ~/.openclaw/workspace/skills/paper-acquisition-anti-scrape
```

也可以先 clone 到任意位置，再运行自带安装脚本：

```bash
git clone https://github.com/jyluo1994/paper-acquisition-anti-scrape.git
cd paper-acquisition-anti-scrape
bash scripts/install.sh
```

安装到指定目录：

```bash
bash scripts/install.sh /path/to/your/skills
```

如果你的 OpenClaw/Codex 只在启动时加载 skill，安装后请重启。

## 必需依赖：scansci-pdf MCP

安装公开 Python 包：

```bash
python3 -m pip install -U scansci-pdf
```

把 MCP server 加到 OpenClaw 的 gateway 配置里，通常是 `gateway.yaml`：

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "scansci-pdf"
      args: ["run"]
```

如果 `scansci-pdf` 安装在虚拟环境中，把 `command` 指向虚拟环境里的可执行文件：

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "/home/USER/.scansci-pdf/venv/bin/scansci-pdf"
      args: ["run"]
```

重启 gateway 后检查：

```text
scansci_pdf_setup_check
scansci_pdf_health_check
```

## 可选：浏览器兜底

只有当普通 `scansci-pdf` 下载失败，并且原因是出版商需要真实浏览器会话、机构 SSO 或浏览器专属 PDF 交付时，才需要这一步。

先安装 Chrome/Chromium 和 Node.js，然后从授权来源准备 browser-probe 脚本：

```bash
mkdir -p ~/.openclaw
cp -R /authorized/source/browser-probe ~/.openclaw/browser-probe
cd ~/.openclaw/browser-probe
npm install
```

预期脚本：

```text
~/.openclaw/browser-probe/acquire-paper.js
~/.openclaw/browser-probe/fetch-paper-pdf.js
~/.openclaw/browser-probe/fetch-wiley-simple.js
~/.openclaw/browser-probe/elsevier-session-acquire.js
~/.openclaw/browser-probe/test-springer-download-from-doi.js
```

启动开启 CDP 的 Chrome：

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

macOS：

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

检查 CDP：

```bash
curl -s http://127.0.0.1:9222/json/version
```

## 环境检查

在已安装的 skill 目录中运行：

```bash
bash scripts/check_environment.sh
```

这个脚本会检查 Python、Node、npm、`scansci-pdf`、Chrome/Chromium、browser-probe 脚本和 Chrome DevTools 端点。

## 常用工作流

### 下载单篇论文

```text
Use $paper-acquisition-anti-scrape to download 10.xxxx/yyyy.
```

skill 会优先尝试：

```text
scansci_pdf_smart_download(identifier="10.xxxx/yyyy")
```

或：

```text
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="fastest")
```

### 仅使用开放/授权来源

```text
Use $paper-acquisition-anti-scrape to download this DOI using legal/open sources only: 10.xxxx/yyyy.
```

预期工具路径：

```text
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="legal_only")
```

### 先检索，再下载选中的结果

```text
Use $paper-acquisition-anti-scrape to search papers about "plant functional traits climate change" after 2020 and show candidates before downloading.
```

预期工具路径：

```text
scansci_pdf_search(query="plant functional traits climate change", year_from=2020, limit=20, sort="cited_by_count")
```

从返回结果中选择论文，再下载对应 DOI。

### 从列表批量下载

创建 `papers.md`，里面可以放 DOI、标题或参考文献，然后请求：

```text
Use $paper-acquisition-anti-scrape to resolve and download papers in papers.md.
```

预期工具路径：

```text
scansci_pdf_parse_list(file_path="papers.md")
scansci_pdf_resolve_and_download(file_path="papers.md", resolve_titles=true)
```

### 机构登录

当 `scansci-pdf` 返回 paywall 或 login required：

```text
scansci_pdf_login(identifier="10.xxxx/yyyy")
```

在打开的浏览器中手动完成 SSO/CARSI/OpenAthens 登录，完成后关闭浏览器，再重试：

```text
scansci_pdf_download(identifier="10.xxxx/yyyy")
```

### WebVPN

```text
scansci_pdf_vpnsci_schools(query="学校关键词")
scansci_pdf_vpnsci_set_school(school="学校全名")
scansci_pdf_vpnsci_login
scansci_pdf_vpnsci_test
scansci_pdf_download(identifier="10.xxxx/yyyy", use_vpnsci=true)
```

### 浏览器兜底

当 `scansci-pdf` 因浏览器专属交付、403、TLS 指纹或挑战页面失败后使用：

```bash
node ~/.openclaw/browser-probe/acquire-paper.js "10.xxxx/yyyy"
```

出版商专用兜底：

```bash
node ~/.openclaw/browser-probe/fetch-wiley-simple.js "https://onlinelibrary.wiley.com/doi/10.xxxx/yyyy"
node ~/.openclaw/browser-probe/elsevier-session-acquire.js "10.1016/...."
node ~/.openclaw/browser-probe/test-springer-download-from-doi.js "10.1007/...."
```

## 冷却规则

批量下载时按以下维度限速：

```text
publisher + proxy/network exit + login profile
```

默认延迟：

| 事件 | 延迟 |
| --- | --- |
| PDF 下载成功 | 45-90 秒 |
| 未找到 PDF / DOI 未解析 | 15-30 秒 |
| 网络超时 | 90-180 秒 |
| 403 / suspicious traffic | 10-15 分钟 |
| 人机验证 / CAPTCHA | 30-60 分钟，不自动重试 |
| 同一 bucket 连续失败 3 次 | 10-15 分钟，并重新评估路线 |

## 故障排查

优先运行：

```text
scansci_pdf_setup_check
scansci_pdf_health_check
scansci_pdf_network_diagnose
```

检查浏览器兜底：

```bash
bash scripts/check_environment.sh
curl -s http://127.0.0.1:9222/json/version
```

如果 CDP 不可访问，重新启动 Chrome：

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

## 安全与隐私

- 不要提交或分享 cookie、浏览器 profile、SSO 会话目录、代理凭据、API key 或机构登录数据。
- 不要自动化破解 CAPTCHA 或人机验证。
- 优先使用开放获取和授权机构访问。
- 如果出版商阻断某条路线，先冷却，不要快速重试或频繁轮换出口。

## 公开依赖链接

- scansci-pdf: <https://pypi.org/project/scansci-pdf/>
- Camoufox: <https://camoufox.com/python/installation/>
- puppeteer-core: <https://www.npmjs.com/package/puppeteer-core>
- ZeroOmega: <https://github.com/zero-peak/ZeroOmega>
