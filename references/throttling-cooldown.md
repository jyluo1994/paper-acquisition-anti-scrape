# Throttling and Cooldown

Use this reference for batch jobs, retries, proxy rotation, or any publisher challenge.

## Bucket Key

Throttle by:

```text
provider + proxy_or_network_exit + login_profile
```

Examples:

```text
elsevier + campus-webvpn + ~/.scansci-pdf/vpnsci
wiley + tor-exit + ~/.openclaw/browser-clone
springer + direct-network + no-login
```

## Default Limits

| Event | Delay before next request in same bucket |
| --- | --- |
| Successful PDF download | 45-90 seconds with jitter |
| PDF not found / DOI unresolved | 15-30 seconds |
| Network timeout or transient download failure | 90-180 seconds |
| 403 / suspicious traffic / publisher block | 10-15 minutes |
| Human verification or CAPTCHA | 30-60 minutes; do not auto-retry |
| Three consecutive failures in one bucket | 10-15 minutes and route review |

Global batch defaults:

```text
global concurrency: 1
per-publisher concurrency: 1
same-login-profile concurrency: 1
```

## Retry Rules

- Retry transient network errors once after cooldown.
- Do not retry `paywall` until login has changed.
- Do not retry `human_verification_required` automatically.
- Do not rotate proxies rapidly against the same publisher; rotate only after a route review and cooldown.
- For bulk jobs, mark failed items and continue with a different provider bucket only when it will not amplify the same block.

## Minimal Attempt Log

Record enough evidence to avoid repeated blind attempts:

```text
timestamp:
identifier:
provider:
bucket:
method: scansci-pdf | browser-probe | publisher-script | sso-login
result: success | not_found | paywall | login_required | 403 | human_verification | network_error
file_path:
next_allowed_time:
notes:
```

## Batch Completion Report

Group final results as:

- Downloaded: identifier -> file path.
- Needs user login: identifier -> publisher/login route.
- Cooldown active: identifier -> provider bucket and next allowed time.
- Not found: identifier -> resolution evidence.
- Failed diagnostics: identifier -> command/error summary.
