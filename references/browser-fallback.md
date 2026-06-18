# Browser Fallback

Use this reference when `scansci-pdf` returns paywall, login-required, 403, TLS fingerprint, Cloudflare, Turnstile, or browser-only PDF errors.

## Core Insight

Many publishers deliver PDFs behind browser-mediated flows. Even with valid cookies, Python HTTP clients can fail because the CDN observes a different TLS/client fingerprint. In those cases, fetch the PDF through a real browser session and download the PDF bytes through Chrome DevTools Protocol or the browser's download manager.

## Preconditions

- Chrome/Chromium is installed.
- A persistent user data directory is available, usually `~/.openclaw/browser-clone`.
- CDP is reachable at `http://127.0.0.1:9222/json/version` when using existing-browser mode.
- `~/.openclaw/browser-probe/` exists and `npm install` has been run.
- Any institutional login is performed by the user in the browser; never ask the agent to capture passwords.

## Standard Flow

1. Start or connect to Chrome with CDP.
2. Resolve DOI to a publisher landing page.
3. Detect publisher and available PDF links/buttons.
4. If login is required, let the user complete SSO/CARSI/OpenAthens/WebVPN/EZProxy.
5. Revisit the landing page with the same browser profile.
6. Click or navigate to the PDF endpoint.
7. Confirm `Content-Type: application/pdf` or a PDF magic header before saving.
8. Save with deterministic naming and report the path.

Preferred command:

```bash
node ~/.openclaw/browser-probe/acquire-paper.js "10.xxxx/yyyy"
```

## Cookie Persistence

Common locations:

```text
~/.scansci-pdf/camofox/
~/.scansci-pdf/vpnsci/
~/.scansci-pdf/ezproxy/
~/.openclaw/browser-clone/Default
```

Do not share these folders. They may contain private login state.

## Human Verification

If the browser shows a CAPTCHA, Turnstile, suspicious-traffic page, or repeated access challenge:

1. Stop automated retries for that publisher/proxy bucket.
2. Record the challenge type and URL.
3. Apply the challenge cooldown in `throttling-cooldown.md`.
4. Ask the user to complete legitimate verification manually if they have authorized access.
5. Retry once after successful manual verification; if it fails again, switch route or stop.

## When Browser Fallback Is Not Enough

Browser fallback will not solve:

- Missing institutional entitlement.
- Expired SSO sessions where the user cannot log in.
- Publisher blocks for a proxy exit after repeated rapid attempts.
- Nonexistent DOI or article pages without PDF availability.
- Legal or policy restrictions on access.
