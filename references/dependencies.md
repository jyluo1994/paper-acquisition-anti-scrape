# Dependencies and Installation

Use this reference when setting up the skill on a new OpenClaw/Codex machine or when an environment check fails.

## What This Package Includes

This skill package includes:

- `SKILL.md`
- `references/`
- `scripts/install.sh`
- `scripts/check_environment.sh`
- `agents/openai.yaml`

This package does not bundle third-party binaries, browser extensions, publisher cookies, institutional credentials, or the user's private `~/.openclaw/browser-probe` scripts. Those must be installed from public sources or copied from an authorized internal source.

## Install the Skill Itself

From the unpacked skill folder:

```bash
bash scripts/install.sh
```

Default destination order:

1. `$OPENCLAW_SKILLS_DIR`
2. `$CODEX_HOME/skills`
3. `~/.openclaw/workspace/skills` when it exists
4. `~/.codex/skills`

To install somewhere explicit:

```bash
bash scripts/install.sh /path/to/workspace/skills
```

## scansci-pdf MCP

Public source: <https://pypi.org/project/scansci-pdf/>

Install the public package:

```bash
python3 -m pip install -U scansci-pdf
```

Requires Python 3.11 or newer.

OpenClaw `gateway.yaml` example:

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "scansci-pdf"
      args: ["run"]
```

If installed in a virtual environment, point `command` to the venv executable, for example:

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "/home/USER/.scansci-pdf/venv/bin/scansci-pdf"
      args: ["run"]
```

After editing the gateway config, restart the OpenClaw/Codex gateway and run:

```text
scansci_pdf_setup_check
scansci_pdf_health_check
```

## Browser Fallback Dependencies

Install Node.js and Chrome/Chromium. If `browser-probe` uses Puppeteer directly, use the public package at <https://www.npmjs.com/package/puppeteer-core> or the Puppeteer docs at <https://pptr.dev/guides/installation>.

Then prepare the browser-probe scripts:

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

Start Chrome with CDP enabled when scripts connect to an existing browser:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.openclaw/browser-clone"
```

On macOS:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

## Optional Components

### Camofox/Camoufox

Public sources:

- <https://camoufox.com/python/installation/>
- <https://pypi.org/project/camoufox/>

Use when persistent anti-detection browser sessions are required by `scansci-pdf` or local browser scripts:

```bash
python3 -m pip install -U camoufox[geoip]
python3 -m camoufox fetch
```

### Puppeteer

Use when `browser-probe` does not already include dependencies:

```bash
cd ~/.openclaw/browser-probe
npm install puppeteer-core
```

### Tor

Prefer scansci-pdf managed Tor:

```text
scansci_pdf_tor_install
scansci_pdf_tor_start
```

Use `scansci_pdf_tor_start(use_bridges=true)` only where bridges are appropriate and allowed.

### Proxy Extension

ZeroOmega/SwitchyOmega-style browser proxy profiles are optional. Configure them manually in Chrome when the browser fallback needs to match an existing proxy route.

Public sources:

- <https://github.com/zero-peak/ZeroOmega>
- <https://chromewebstore.google.com/detail/proxy-switchyomega-3-zero/pfnededegaaopdmhkdmcofjmoldfiped>

## Redistribution Notes

- It is safe to share this skill folder.
- Do not share browser profiles, cookies, SSO session stores, proxy credentials, API keys, or institutional login data.
- Do not claim that browser-probe or CloakBrowser is included unless the package actually includes those files and redistribution is allowed.
