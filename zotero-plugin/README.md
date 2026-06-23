# Zotero Plugin

This directory contains a Zotero 7 plugin that adds a right-click command to Zotero items:

```text
Acquire PDF via Paper Acquisition
```

The plugin does not store institutional cookies, proxy credentials, or browser sessions in Zotero. It sends item metadata to a local service bound to `127.0.0.1`, waits for the service to acquire the PDF, and imports the returned local PDF path as a child attachment.

## Build

From the repository root:

```bash
bash scripts/build-zotero-plugin.sh
```

The XPI is written to:

```text
dist/paper-acquisition-anti-scrape-zotero.xpi
```

Install it in Zotero 7 from:

```text
Tools -> Add-ons -> Install Add-on From File...
```

## Required Local Service

Start the service before using the menu command:

```bash
node service/src/server.js
```

The default service URL is:

```text
http://127.0.0.1:24372
```

