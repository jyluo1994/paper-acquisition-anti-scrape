# Browser Fallback

Use this reference when `scansci-pdf` returns paywall, login-required, 403, TLS fingerprint, Cloudflare, Turnstile, or browser-only PDF errors.

## Core Insight

Many publishers deliver PDFs behind browser-mediated flows. Even with valid cookies, Python HTTP clients can fail because the CDN observes a different TLS/client fingerprint. In those cases, fetch the PDF through a real browser session and download the PDF bytes through Chrome DevTools Protocol or the browser's download manager.

## Preconditions

- Chrome/Chromium is installed.
- Node.js with `puppeteer-core`:
  ```bash
  npm install puppeteer-core
  ```
- Chrome CDP reachable at `http://127.0.0.1:9222`:
  ```bash
  google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.openclaw/browser-clone"
  ```
- The script at `scripts/browser-fallback.js` is available.

## Standard Flow

1. Start or connect to Chrome with CDP.
2. Run the fallback script:
   ```bash
   node scripts/browser-fallback.js "10.xxxx/yyyy"
   ```
3. The script automatically:
   - Resolves DOI to publisher landing page
   - Detects publisher and available PDF links
   - Downloads PDF through CDP
   - Reports structured status to stdout

## Cookie Persistence

Login state persists across runs in the Chrome user data directory:

```text
$HOME/.openclaw/browser-clone/Default/
```

For institutional access, run `scansci_pdf_login(identifier="DOI")` which handles SSO through CloakBrowser, then retry the fallback script with the same browser profile.

## Human Verification

If the browser shows a CAPTCHA, Turnstile, or suspicious-traffic page:

1. Stop automated retries for that publisher/proxy bucket.
2. Record the challenge type and URL.
3. Apply the challenge cooldown (see `throttling-cooldown.md`).
4. Ask the user to complete legitimate verification manually.
5. Retry once after successful manual verification.

## When Browser Fallback Is Not Enough

- Missing institutional entitlement.
- Expired SSO sessions.
- Publisher blocks after repeated rapid attempts.
- Nonexistent DOI or articles without PDF availability.
