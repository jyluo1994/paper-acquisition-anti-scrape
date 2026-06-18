# Provider Adapters

Use this reference after identifying the publisher from DOI prefix, landing URL, redirects, or page metadata.

## Generic Detection Order

1. Resolve DOI and follow redirects in a browser.
2. Check page metadata for publisher and article identifiers.
3. Look for PDF links with `href` or button labels containing `pdf`, `epdf`, `download pdf`, `view pdf`, `content/pdf`, or `pdfft`.
4. Prefer links that keep the same authenticated browser context.
5. Verify the saved response is a PDF before marking success.

## Wiley

Typical route:

```text
landing page -> /doi/epdf/<doi> -> /doi/pdfdirect/<doi>
```

Use:

```bash
node ~/.openclaw/browser-probe/fetch-wiley-simple.js "https://onlinelibrary.wiley.com/doi/10.xxxx/yyyy"
```

Notes:

- Wiley often serves an enhanced PDF (`epdf`) page before the direct PDF.
- If a direct PDF request returns HTML, inspect redirects and session cookies in the browser.
- Cool down after repeated 403 or challenge pages.

## Elsevier / ScienceDirect

Typical signals:

```text
DOI prefix 10.1016/
sciencedirect.com/science/article/pii/<PII>
download link containing pdfft
```

Use:

```bash
node ~/.openclaw/browser-probe/elsevier-session-acquire.js "10.1016/...."
```

Preferred fast path when configured:

```text
scansci_pdf_elsevier_setup
scansci_pdf_config_set(key="elsevier_api_key", value="...")
```

Notes:

- Elsevier API can be faster and less fragile than browser scraping when available.
- Browser mode should reuse the same logged-in session that sees the PDF button.
- If the user lacks entitlement, do not keep retrying browser downloads.

## Springer / Nature

Typical signals:

```text
springer.com
link.springer.com
nature.com
/content/pdf/
```

Use:

```bash
node ~/.openclaw/browser-probe/test-springer-download-from-doi.js "10.1007/...."
```

Notes:

- Many Springer/Nature pages expose stable `/content/pdf/...pdf` links.
- Check whether the PDF is open access before invoking SSO.
- If a page presents article HTML only, inspect buttons and metadata instead of guessing a PDF URL.

## Science / AAAS, PNAS, ACS, IEEE, Taylor & Francis

Use `scansci_pdf_login(identifier="DOI")` first for authorized institutional access, then retry `scansci_pdf_download`. If the retry reports browser-only or TLS/403 problems, use the generic browser fallback.

Do not create publisher-specific URL templates unless verified on the current article page. These providers change link structures and access widgets often.
