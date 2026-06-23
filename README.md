# Paper Acquisition Anti-Scrape Skill

<p align="center">
  <a href="README.md"><strong>English</strong></a> |
  <a href="README.zh-CN.md">中文</a>
</p>

<p align="center">
  <img alt="OpenClaw/Codex Skill" src="https://img.shields.io/badge/OpenClaw%2FCodex-skill-2563eb">
  <img alt="MCP scansci-pdf" src="https://img.shields.io/badge/MCP-scansci--pdf-059669">
</p>

OpenClaw/Codex skill for resilient academic PDF acquisition. It uses an OA-first workflow with `scansci-pdf`, then falls back to authorized institutional login and real-browser PDF download when publisher pages require browser sessions.

This repository is the skill folder itself. Clone it into your local `skills/` directory as `paper-acquisition-anti-scrape`.

## At a Glance

| Need | Route |
| --- | --- |
| Fast DOI/arXiv PDF download | `scansci-pdf` MCP |
| Paywall with authorized access | SSO/CARSI/OpenAthens/WebVPN/EZProxy login |
| Browser-only PDF delivery | Chrome CDP + browser-probe scripts |
| Batch download without triggering blocks | Per-publisher cooldown and retry rules |

## Contents

- [Quick Install](#quick-install)
- [Required Dependency: scansci-pdf MCP](#required-dependency-scansci-pdf-mcp)
- [Optional Browser Fallback](#optional-browser-fallback)
- [Zotero Plugin MVP](#zotero-plugin-mvp)
- [Common Workflows](#common-workflows)
- [Troubleshooting](#troubleshooting)
- [Safety and Privacy](#safety-and-privacy)

## What It Does

- Download academic PDFs from DOI, DOI URL, arXiv ID, title lists, or BibTeX.
- Prefer open-access and legal/authorized sources first.
- Use `scansci-pdf` MCP for fast search, citation export, WebVPN, Tor, and batch download workflows.
- Use browser fallback for publisher pages that require Chrome/CDP, SSO cookies, or browser-only PDF delivery.
- Provide cooldown rules for publisher throttling, human verification, and bulk jobs.
- Keep private data out of the skill: no cookies, browser profiles, credentials, API keys, or institutional sessions are included.

## Quick Install

Choose the skills directory used by your OpenClaw/Codex workspace.

Common locations:

```bash
~/.openclaw/workspace/skills
~/.codex/skills
```

Clone directly into that directory:

```bash
mkdir -p ~/.openclaw/workspace/skills
git clone https://github.com/jyluo1994/paper-acquisition-anti-scrape.git \
  ~/.openclaw/workspace/skills/paper-acquisition-anti-scrape
```

Or clone anywhere and run the bundled installer:

```bash
git clone https://github.com/jyluo1994/paper-acquisition-anti-scrape.git
cd paper-acquisition-anti-scrape
bash scripts/install.sh
```

Install to an explicit directory:

```bash
bash scripts/install.sh /path/to/your/skills
```

Restart OpenClaw/Codex if your environment loads skills only at startup.

## Required Dependency: scansci-pdf MCP

Install the public Python package:

```bash
python3 -m pip install -U scansci-pdf
```

Add the MCP server to your OpenClaw gateway config, usually `gateway.yaml`:

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "scansci-pdf"
      args: ["run"]
```

If you installed `scansci-pdf` inside a virtual environment, point `command` to the executable:

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "/home/USER/.scansci-pdf/venv/bin/scansci-pdf"
      args: ["run"]
```

Restart the gateway, then check:

```text
scansci_pdf_setup_check
scansci_pdf_health_check
```

## Optional Browser Fallback

Use this only when normal `scansci-pdf` download fails because the publisher requires a real browser session, institutional SSO, or browser-only PDF delivery.

Install Chrome/Chromium and Node.js, then prepare the browser-probe scripts from an authorized source:

```bash
mkdir -p ~/.openclaw
cp -R /authorized/source/browser-probe ~/.openclaw/browser-probe
cd ~/.openclaw/browser-probe
npm install
```

Expected scripts:

```text
~/.openclaw/browser-probe/acquire-paper.js
~/.openclaw/browser-probe/fetch-paper-pdf.js
~/.openclaw/browser-probe/fetch-wiley-simple.js
~/.openclaw/browser-probe/elsevier-session-acquire.js
~/.openclaw/browser-probe/test-springer-download-from-doi.js
```

Start Chrome with CDP enabled:

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

macOS:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

Check CDP:

```bash
curl -s http://127.0.0.1:9222/json/version
```

## Zotero Plugin MVP

This repository includes a Zotero plugin scaffold for Zotero 7 through 10 and a local helper service:

```bash
node service/src/server.js
bash scripts/build-zotero-plugin.sh
```

The XPI is built at:

```text
dist/paper-acquisition-anti-scrape-zotero.xpi
```

Install it in Zotero from `Tools -> Add-ons -> Install Add-on From File...`.

The plugin adds `Acquire PDF via Paper Acquisition` to Zotero's item context menu. It sends DOI/title/URL metadata to the local service, polls the job status, and imports a returned PDF path as a child attachment. Institutional cookies and browser profiles stay outside Zotero under local service-controlled directories.

See [docs/zotero-plugin.md](docs/zotero-plugin.md) for the current API and security boundary.

## Environment Check

From the installed skill folder:

```bash
bash scripts/check_environment.sh
```

This checks Python, Node, npm, `scansci-pdf`, Chrome/Chromium, browser-probe scripts, and the Chrome DevTools endpoint.

## Common Workflows

### Download One Paper

```text
Use $paper-acquisition-anti-scrape to download 10.xxxx/yyyy.
```

The skill should first try:

```text
scansci_pdf_smart_download(identifier="10.xxxx/yyyy")
```

or:

```text
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="fastest")
```

### OA / Authorized-Only Download

```text
Use $paper-acquisition-anti-scrape to download this DOI using legal/open sources only: 10.xxxx/yyyy.
```

Expected tool route:

```text
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="legal_only")
```

### Search, Then Download Selected Results

```text
Use $paper-acquisition-anti-scrape to search papers about "plant functional traits climate change" after 2020 and show candidates before downloading.
```

Expected tool route:

```text
scansci_pdf_search(query="plant functional traits climate change", year_from=2020, limit=20, sort="cited_by_count")
```

Pick papers from the returned list, then download selected DOI values.

### Batch Download from a List

Create `papers.md` with DOI values, titles, or references, then ask:

```text
Use $paper-acquisition-anti-scrape to resolve and download papers in papers.md.
```

Expected tool route:

```text
scansci_pdf_parse_list(file_path="papers.md")
scansci_pdf_resolve_and_download(file_path="papers.md", resolve_titles=true)
```

### Institutional Login

When `scansci-pdf` reports paywall or login required:

```text
scansci_pdf_login(identifier="10.xxxx/yyyy")
```

Complete SSO/CARSI/OpenAthens login manually in the opened browser, close the browser when done, then retry:

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

### Browser Fallback

Use after `scansci-pdf` fails with browser-only delivery, 403, TLS fingerprint, or challenge-related symptoms:

```bash
node ~/.openclaw/browser-probe/acquire-paper.js "10.xxxx/yyyy"
```

Publisher-specific fallback:

```bash
node ~/.openclaw/browser-probe/fetch-wiley-simple.js "https://onlinelibrary.wiley.com/doi/10.xxxx/yyyy"
node ~/.openclaw/browser-probe/elsevier-session-acquire.js "10.1016/...."
node ~/.openclaw/browser-probe/test-springer-download-from-doi.js "10.1007/...."
```

## Cooldown Rules

For bulk downloads, throttle by:

```text
publisher + proxy/network exit + login profile
```

Default delays:

| Event | Delay |
| --- | --- |
| Successful PDF download | 45-90 seconds |
| PDF not found / DOI unresolved | 15-30 seconds |
| Network timeout | 90-180 seconds |
| 403 / suspicious traffic | 10-15 minutes |
| Human verification / CAPTCHA | 30-60 minutes, no automatic retry |
| Three consecutive failures in one bucket | 10-15 minutes and route review |

## Troubleshooting

Run these first:

```text
scansci_pdf_setup_check
scansci_pdf_health_check
scansci_pdf_network_diagnose
```

Check browser fallback:

```bash
bash scripts/check_environment.sh
curl -s http://127.0.0.1:9222/json/version
```

If CDP is not reachable, restart Chrome with:

```bash
google-chrome --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

## Safety and Privacy

- Do not commit or share cookies, browser profiles, SSO session stores, proxy credentials, API keys, or institutional login data.
- Do not automate CAPTCHA solving or human-verification challenges.
- Prefer open access and authorized institutional access.
- If a publisher blocks a route, cool down instead of rapidly retrying or rotating exits.

## Public Dependency Links

- scansci-pdf: <https://pypi.org/project/scansci-pdf/>
- Camoufox: <https://camoufox.com/python/installation/>
- puppeteer-core: <https://www.npmjs.com/package/puppeteer-core>
- ZeroOmega: <https://github.com/zero-peak/ZeroOmega>
