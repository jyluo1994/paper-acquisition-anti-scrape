# Dependencies and Installation

Use this reference when setting up the skill on a new OpenClaw/Codex machine or when an environment check fails.

## What This Package Includes

This skill package includes:

- `SKILL.md`
- `references/`
- `scripts/install.sh`
- `scripts/check_environment.sh`
- `scripts/browser-fallback.js`
- `agents/openai.yaml`

This package does not bundle third-party binaries, browser extensions, publisher cookies, institutional credentials, or API keys.

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

## Required: scansci-pdf MCP

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

If installed in a virtual environment:

```yaml
mcp:
  servers:
    scansci-pdf:
      command: "/home/USER/.scansci-pdf/venv/bin/scansci-pdf"
      args: ["run"]
```

After editing the gateway config, restart the gateway and run:

```text
scansci_pdf_setup_check
scansci_pdf_health_check
```

## Optional: Browser Fallback

Install Node.js, Chrome/Chromium, and puppeteer-core:

```bash
npm install puppeteer-core
```

Start Chrome with CDP enabled:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.openclaw/browser-clone"
```

The bundled script handles the rest:

```bash
node scripts/browser-fallback.js "10.xxxx/yyyy"
```

On macOS:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.openclaw/browser-clone"
```

Verify CDP:

```bash
curl -s http://127.0.0.1:9222/json/version
```

## Optional Components

### Camoufox (anti-detection browser)

Public source: <https://pypi.org/project/camoufox/>

Used by `scansci-pdf` for persistent SSO sessions:

```bash
python3 -m pip install -U camoufox[geoip]
python3 -m camoufox fetch
```

### Tor (anonymous access)

Managed by `scansci-pdf`:

```text
scansci_pdf_tor_install
scansci_pdf_tor_start
scansci_pdf_download(identifier="...", use_tor=true)
```

### Elsevier API Key (free, optional)

Speeds up ScienceDirect downloads 10-30x:

```text
scansci_pdf_elsevier_setup
scansci_pdf_config_set(key="elsevier_api_key", value="your-key")
```

### EZProxy / WebVPN

Configured through `scansci-pdf` commands, see SKILL.md for details.

## Redistribution Notes

- It is safe to share this skill folder.
- Do not share browser profiles, cookies, SSO session stores, proxy credentials, API keys, or institutional login data.
