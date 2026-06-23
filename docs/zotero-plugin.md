# Zotero Plugin Integration

This repository now includes a Zotero 7 plugin MVP plus a local helper service.

## What Works In This MVP

- Adds a Zotero item context-menu command: `Acquire PDF via Paper Acquisition`.
- Adds profile-specific commands:
  - `Acquire PDF using profile...`
  - `Refresh institution login profile...`
- Sends selected Zotero item metadata to `http://127.0.0.1:24372/api/acquire`.
- Polls the local job endpoint.
- Imports a returned local PDF path as a child attachment.
- Writes non-sensitive status tags:
  - `pdf:acquiring`
  - `pdf:acquired`
  - `pdf:login-required`
  - `pdf:cooldown`
  - `pdf:captcha-stop`
  - `pdf:failed`
  - `pdf:missing-metadata`
- Keeps institutional cookies outside Zotero.

## Start The Local Service

```bash
node service/src/server.js
```

Health check:

```bash
curl http://127.0.0.1:24372/health
```

The service wraps the existing browser fallback script:

```text
scripts/browser-fallback.js
```

Optionally configure a fast command that runs before browser fallback:

```bash
PAA_FAST_COMMAND='scansci-pdf download --strategy fastest --output-dir {downloadDir} {identifier}' \
  node service/src/server.js
```

Supported placeholders:

- `{identifier}`
- `{doi}`
- `{url}`
- `{title}`
- `{profile}`
- `{downloadDir}`

The command should print a JSON line with either `{"status":"ok","pdf_path":"/path/to/file.pdf"}` or a controlled failure status such as `paywall`, `login_required`, `human_verification_required`, or `cooldown`.

Downloaded PDFs default to:

```text
~/.paper-acquisition/downloads
```

## Build The Zotero XPI

```bash
bash scripts/build-zotero-plugin.sh
```

Output:

```text
dist/paper-acquisition-anti-scrape-zotero.xpi
```

Install in Zotero 7:

```text
Tools -> Add-ons -> Install Add-on From File...
```

## Institution Sessions

Use the login endpoint to start a dedicated browser profile:

```bash
curl -X POST http://127.0.0.1:24372/api/login/sysu-webvpn \
  -H 'Content-Type: application/json' \
  -d '{"loginUrl":"about:blank"}'
```

Profiles are stored under:

```text
~/.paper-acquisition/profiles
```

Use separate profile names for separate institutional routes, for example:

- `pumc-proxy`
- `sysu-webvpn`

Do not export or commit these profile directories.

## Security Boundary

The Zotero plugin must not store raw cookies, proxy passwords, SSO tokens, or request headers. Zotero receives only:

- item metadata
- job status
- final local PDF path
- non-sensitive route/provider metadata
