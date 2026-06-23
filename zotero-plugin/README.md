# Zotero Plugin

This directory contains a Zotero 7 plugin that adds right-click commands to Zotero items:

```text
Acquire PDF via Paper Acquisition
Acquire PDF using profile...
Refresh institution login profile...
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

The bundled service includes example institution profiles such as `pumc-kokonur-zeroomega`, `pumc-webvpn`, `sysu-carsi`, `sysu-portal`, and `sysu-vpn`. The PUMC profile reuses Chrome ZeroOmega's `kokonur` profile and does not store proxy credentials in this repository.
