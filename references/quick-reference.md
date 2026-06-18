# Quick Reference

Use this reference for common commands after the environment is installed.

## Single Paper

```text
scansci_pdf_smart_download(identifier="10.xxxx/yyyy")
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="fastest")
scansci_pdf_download(identifier="2301.00001", strategy="fastest")
```

OA/authorized-only:

```text
scansci_pdf_download(identifier="10.xxxx/yyyy", strategy="legal_only")
```

## Search Then Download

```text
scansci_pdf_search(query="topic terms", limit=20, year_from=2020, sort="cited_by_count")
scansci_pdf_download(identifier="SELECTED_DOI")
```

Ask the user to choose results before downloading many papers from a broad search.

## Lists and BibTeX

```text
scansci_pdf_parse_list(file_path="papers.md")
scansci_pdf_resolve_and_download(file_path="papers.md", resolve_titles=true)
scansci_pdf_import_bib(bib_file="library.bib")
```

## Institutional Login

General SSO:

```text
scansci_pdf_login(identifier="10.xxxx/yyyy")
scansci_pdf_download(identifier="10.xxxx/yyyy")
```

Camofox persistent session:

```text
scansci_pdf_camofox_login(login_type="carsi")
scansci_pdf_camofox_status
```

WebVPN:

```text
scansci_pdf_vpnsci_schools(query="学校关键词")
scansci_pdf_vpnsci_set_school(school="学校全名")
scansci_pdf_vpnsci_login
scansci_pdf_vpnsci_test
scansci_pdf_download(identifier="10.xxxx/yyyy", use_vpnsci=true)
```

EZProxy:

```text
scansci_pdf_config_set(key="ezproxy_enabled", value="true")
scansci_pdf_config_set(key="ezproxy_login_url", value="https://libproxy.example.edu/login?url={url}")
scansci_pdf_ezproxy_login
scansci_pdf_ezproxy_status
```

## Browser Fallback

Check CDP:

```bash
curl -s http://127.0.0.1:9222/json/version
```

Start Chrome with CDP:

```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.openclaw/browser-clone"
```

Run generic acquisition:

```bash
node ~/.openclaw/browser-probe/acquire-paper.js "10.xxxx/yyyy"
```

Publisher scripts:

```bash
node ~/.openclaw/browser-probe/fetch-wiley-simple.js "https://onlinelibrary.wiley.com/doi/10.xxxx/yyyy"
node ~/.openclaw/browser-probe/elsevier-session-acquire.js "10.1016/...."
node ~/.openclaw/browser-probe/test-springer-download-from-doi.js "10.1007/...."
```

## Proxy and Tor

```text
scansci_pdf_network_diagnose
scansci_pdf_config_set(key="network_proxy", value="socks5://127.0.0.1:1080")
scansci_pdf_tor_install
scansci_pdf_tor_start
scansci_pdf_download(identifier="10.xxxx/yyyy", use_tor=true)
```

## Diagnostics

```text
scansci_pdf_setup_check
scansci_pdf_health_check
scansci_pdf_source_scores
scansci_pdf_network_diagnose
```

Local package check:

```bash
bash scripts/check_environment.sh
```
