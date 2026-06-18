---
name: paper-acquisition-anti-scrape
description: Use when acquiring academic paper PDFs from DOI, arXiv IDs, titles, BibTeX, or publisher pages needs a resilient OA-first workflow with scansci-pdf, browser-based PDF fallback, institutional SSO/CARSI/OpenAthens/WebVPN/EZProxy login, persistent cookies, proxy-aware throttling, publisher-specific adapters, or anti-bot/TLS-fingerprint troubleshooting.
---

# Paper Acquisition Anti-Scrape

## Overview

Acquire academic PDFs in a staged, low-risk order: fast open-source retrieval first, authorized institutional access second, real-browser PDF download last. Use this skill to coordinate `scansci-pdf` MCP tools with OpenClaw/Codex browser-probe scripts while respecting publisher rate limits and human-verification boundaries.

## Ground Rules

- Prefer lawful/open access and authorized institutional access. Do not collect passwords, export another person's cookies, or automate CAPTCHA/human-verification solving.
- Start with the lightest channel that can work. Escalate only when the observed failure says the current channel is insufficient.
- Treat publisher plus proxy exit as the throttling key. A ScienceDirect request from Tor and the same request from campus WebVPN are different buckets.
- If a page asks for human verification, stop automated retries for that bucket and cool down. Let the user complete legitimate checks manually if appropriate.
- For paywalled papers, do not loop blindly. One login attempt plus one retry is the normal path; repeated failures need diagnostics or a different authorized route.

## Workflow

1. Normalize the request.
   - Extract DOI, DOI URL, arXiv ID, PMID/PMCID, title, or BibTeX entries.
   - If only titles are available, search/resolve first; do not guess DOI values.
   - Ask for an output directory only when the user did not provide one and persistence matters.

2. Try the fast channel.
   - Prefer `scansci_pdf_smart_download(identifier=...)`.
   - Use `scansci_pdf_download(identifier=..., strategy="fastest")` when explicit strategy control is needed.
   - Use `strategy="legal_only"` when the user asks for OA/authorized-only retrieval.
   - For lists, use `scansci_pdf_parse_list` before `scansci_pdf_resolve_and_download`.

3. Interpret failure before escalating.
   - `not_found`: try title resolution, DOI normalization, or a publisher page.
   - `paywall` / `login_required`: use institutional login before retrying.
   - `403`, TLS/fingerprint, Cloudflare, Turnstile, or browser-only PDF links: use browser fallback.
   - Network/DNS/proxy errors: run diagnostics before retrying.

4. Use authorized login when required.
   - General SSO: `scansci_pdf_login(identifier="DOI")`.
   - Camofox persistent login: `scansci_pdf_camofox_login(login_type="carsi")`, `webvpn`, `ezproxy`, or `custom`.
   - Chinese university WebVPN: `scansci_pdf_vpnsci_set_school(school="...")`, then `scansci_pdf_vpnsci_login`, then retry with `use_vpnsci=true`.
   - EZProxy: configure `ezproxy_login_url`, run `scansci_pdf_ezproxy_login`, then retry.

5. Use browser fallback for browser-only PDF delivery.
   - Read `references/browser-fallback.md` when CDP, Puppeteer, Camofox, CloakBrowser, cookies, or TLS fingerprinting matters.
   - Preferred command: `node ~/.openclaw/browser-probe/acquire-paper.js "DOI"`.
   - Use publisher-specific scripts only after identifying the publisher or DOI pattern.

6. Apply cooldowns and record evidence.
   - Read `references/throttling-cooldown.md` before bulk jobs or after any challenge.
   - For every attempt, record identifier, provider, proxy bucket, method, result, and file path or error.
   - Report partial success clearly: downloaded, needs login, blocked by verification, not found, or failed diagnostics.

## Resource Map

- `references/dependencies.md`: public components, install commands, MCP configuration, and what is not bundled.
- `references/quick-reference.md`: common command snippets for single, batch, login, proxy, Tor, and diagnostics.
- `references/browser-fallback.md`: CDP/Chrome/Puppeteer workflow and cookie persistence.
- `references/provider-adapters.md`: Wiley, ScienceDirect/Elsevier, Springer/Nature, and generic publisher patterns.
- `references/throttling-cooldown.md`: retry delays, challenge cooldowns, and bucket rules.
- `scripts/check_environment.sh`: local dependency check for `scansci-pdf`, Node, Chrome, CDP, and browser-probe.
- `scripts/install.sh`: copy this skill folder into a target OpenClaw/Codex `skills/` directory.

## Diagnostics

Run diagnostics before repeated retries:

```bash
bash scripts/check_environment.sh
```

Then use available MCP checks:

```text
scansci_pdf_setup_check
scansci_pdf_health_check
scansci_pdf_network_diagnose
```

## Completion Criteria

- PDFs are downloaded and paths are reported, or each unresolved identifier has a concrete status and next action.
- Browser fallback is used only when the fast channel fails for a reason it can address.
- Bulk downloads include throttling/cooldown handling and do not retry human-verification failures immediately.
- The final response separates successful files, login-required items, unavailable items, and residual risks.
