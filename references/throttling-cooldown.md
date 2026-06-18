# Throttling & Cooldown 快速参考

## 冷却时间表

| 上次结果 | 等待时间 | 说明 |
|----------|---------|------|
| `ok` | 45-90s jitter | 同出版商同 IP 下载间隔 |
| `no_pdf_link_found` | 15-30s | 快速重试窗 |
| `download_failed` | 90-180s | 等缓存/CDN 刷新 |
| `human_verification_required` | **30-60min** | 触发风控，立即停 |
| 连续 3 次同桶 | 10-15min 长休 | 防累积风险 |

## 日志字段

```json
{
  "bucket": "wiley::Proxy file::egress-1",
  "attempt_index": 2,
  "status": "human_verification_required",
  "cooldown_until": "2026-06-18T16:00:00+08:00"
}
```
