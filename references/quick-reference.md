# 快速命令参考

## 搜索 + 下载
```
scansci_pdf_search(query="...", limit=10, sort="cited_by_count")
scansci_pdf_download(identifier="10.xxxx/xxx", strategy="fastest")
scansci_pdf_batch_download(identifiers=["doi1", "doi2"])
```

## 列表文件
```
scansci_pdf_parse_list(file_path="papers.md")
scansci_pdf_resolve_and_download(file_path="papers.md")
```

## 浏览器降级
```
node ~/.openclaw/browser-probe/acquire-paper.js "10.xxxx/xxx"
```

## 出版商专属下载
```
node ~/.openclaw/browser-probe/fetch-wiley-simple.js "<url>"
node ~/.openclaw/browser-probe/elsevier-session-acquire.js "<doi>"
node ~/.openclaw/browser-probe/test-springer-download-from-doi.js "<doi>"
```

## SSO 登录
```
scansci_pdf_login(identifier="10.xxxx/xxx")
scansci_pdf_camofox_login(login_type="carsi")
```

## WebVPN
```
scansci_pdf_vpnsci_set_school(school="清华大学")
scansci_pdf_vpnsci_login
scansci_pdf_download(identifier="...", use_vpnsci=true)
```

## 诊断
```
scansci_pdf_network_diagnose
scansci_pdf_setup_check
scansci_pdf_health_check
```
