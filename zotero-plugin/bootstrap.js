var PaperAcquisitionAntiScrape;

(function () {
  const MENU_ID = "paper-acquisition-anti-scrape-acquire";
  const MENU_PROFILE_ID = "paper-acquisition-anti-scrape-acquire-profile";
  const MENU_LOGIN_ID = "paper-acquisition-anti-scrape-login";
  const MENU_SEPARATOR_ID = "paper-acquisition-anti-scrape-separator";
  const STATUS_TAGS = [
    "pdf:acquiring",
    "pdf:acquired",
    "pdf:login-required",
    "pdf:cooldown",
    "pdf:captcha-stop",
    "pdf:failed",
    "pdf:missing-metadata"
  ];

  PaperAcquisitionAntiScrape = {
    id: "paper-acquisition-anti-scrape@jyluo1994.github.io",
    prefRoot: "extensions.paperAcquisitionAntiScrape",
    windows: new Set(),

    startup() {
      this.log("Starting Paper Acquisition Anti-Scrape");
      for (let win of this.getMainWindows()) {
        this.addToWindow(win);
      }
    },

    shutdown() {
      for (let win of this.getMainWindows()) {
        this.removeFromWindow(win);
      }
      this.windows.clear();
      this.log("Stopped Paper Acquisition Anti-Scrape");
    },

    onMainWindowLoad({ window }) {
      this.addToWindow(window);
    },

    onMainWindowUnload({ window }) {
      this.removeFromWindow(window);
    },

    getMainWindows() {
      try {
        if (typeof Zotero.getMainWindows === "function") {
          return Zotero.getMainWindows();
        }
      }
      catch (err) {
        this.log(`Could not enumerate Zotero windows: ${err}`);
      }
      return [];
    },

    addToWindow(win) {
      if (!win || !win.document || this.windows.has(win)) return;

      const doc = win.document;
      const menu = doc.getElementById("zotero-itemmenu");
      if (!menu || doc.getElementById(MENU_ID)) return;

      const separator = this.createXULElement(doc, "menuseparator");
      separator.id = MENU_SEPARATOR_ID;

      const acquireItem = this.createXULElement(doc, "menuitem");
      acquireItem.id = MENU_ID;
      acquireItem.setAttribute("label", "Acquire PDF via Paper Acquisition");
      acquireItem.setAttribute("accesskey", "A");
      acquireItem.addEventListener("command", () => {
        this.acquireSelected(win, "auto").catch((err) => {
          this.log(`Acquire failed: ${err.stack || err}`);
          this.alert(win, "Paper Acquisition", err.message || String(err));
        });
      });

      const acquireWithProfileItem = this.createXULElement(doc, "menuitem");
      acquireWithProfileItem.id = MENU_PROFILE_ID;
      acquireWithProfileItem.setAttribute("label", "Acquire PDF using profile...");
      acquireWithProfileItem.addEventListener("command", () => {
        const profile = this.promptText(win, "Paper Acquisition", "Institution profile:", "pumc-kokonur-zeroomega");
        if (!profile) return;
        this.acquireSelected(win, profile).catch((err) => {
          this.log(`Profile acquire failed: ${err.stack || err}`);
          this.alert(win, "Paper Acquisition", err.message || String(err));
        });
      });

      const loginItem = this.createXULElement(doc, "menuitem");
      loginItem.id = MENU_LOGIN_ID;
      loginItem.setAttribute("label", "Refresh institution login profile...");
      loginItem.addEventListener("command", () => {
        this.refreshLoginProfile(win).catch((err) => {
          this.log(`Login profile refresh failed: ${err.stack || err}`);
          this.alert(win, "Paper Acquisition", err.message || String(err));
        });
      });

      menu.appendChild(separator);
      menu.appendChild(acquireItem);
      menu.appendChild(acquireWithProfileItem);
      menu.appendChild(loginItem);
      this.windows.add(win);
    },

    removeFromWindow(win) {
      if (!win || !win.document) return;
      for (let id of [MENU_ID, MENU_PROFILE_ID, MENU_LOGIN_ID, MENU_SEPARATOR_ID]) {
        const node = win.document.getElementById(id);
        if (node) node.remove();
      }
      this.windows.delete(win);
    },

    createXULElement(doc, name) {
      if (typeof doc.createXULElement === "function") {
        return doc.createXULElement(name);
      }
      return doc.createElement(name);
    },

    async acquireSelected(win, profile = "auto") {
      const selected = this.getSelectedRegularItems(win);
      if (!selected.length) {
        this.alert(win, "Paper Acquisition", "Select one or more regular Zotero items first.");
        return;
      }

      const summary = {
        acquired: 0,
        skipped: 0,
        failed: 0,
        loginRequired: 0,
        cooldown: 0,
        captchaStop: 0,
        missingMetadata: 0
      };

      for (let item of selected) {
        try {
          const outcome = await this.acquireItem(item, profile);
          summary[outcome] = (summary[outcome] || 0) + 1;
        }
        catch (err) {
          summary.failed++;
          await this.setOnlyStatusTag(item, "pdf:failed");
          this.log(`Item ${item.key} failed: ${err.stack || err}`);
        }
      }

      this.alert(win, "Paper Acquisition", this.formatSummary(summary));
    },

    getSelectedRegularItems(win) {
      let items = [];
      try {
        items = win.ZoteroPane.getSelectedItems() || [];
      }
      catch (err) {
        this.log(`Could not read selection: ${err}`);
      }

      return items.filter((item) => {
        try {
          return item && typeof item.isRegularItem === "function" && item.isRegularItem();
        }
        catch {
          return false;
        }
      });
    },

    async acquireItem(item, profile = "auto") {
      if (this.getPref("skipExistingPDF", true) && await this.hasPdfAttachment(item)) {
        return "skipped";
      }

      const payload = this.itemPayload(item, profile);
      if (!payload.doi && !payload.url && !payload.title) {
        await this.setOnlyStatusTag(item, "pdf:missing-metadata");
        return "missingMetadata";
      }

      await this.setOnlyStatusTag(item, "pdf:acquiring");

      const serviceURL = this.getServiceURL();
      const queued = await this.postJSON(`${serviceURL}/api/acquire`, payload);
      if (!queued.jobId) {
        throw new Error("Local acquisition service did not return a jobId.");
      }

      const result = await this.pollJob(serviceURL, queued.jobId);
      return await this.handleResult(item, result);
    },

    itemPayload(item, profile = "auto") {
      return {
        zoteroItemKey: item.key,
        libraryID: item.libraryID,
        doi: this.cleanField(item.getField("DOI")),
        title: this.cleanField(item.getField("title")),
        url: this.cleanField(item.getField("url")),
        publicationTitle: this.cleanField(item.getField("publicationTitle")),
        date: this.cleanField(item.getField("date")),
        mode: "manual",
        profile: profile || "auto"
      };
    },

    async refreshLoginProfile(win) {
      const profile = this.promptText(win, "Paper Acquisition", "Institution profile:", "pumc-kokonur-zeroomega");
      if (!profile) return;

      const loginUrl = this.promptText(
        win,
        "Paper Acquisition",
        "Login URL (blank uses profile default):",
        ""
      );

      const serviceURL = this.getServiceURL();
      const body = {};
      if (loginUrl) body.loginUrl = loginUrl;
      const result = await this.postJSON(`${serviceURL}/api/login/${encodeURIComponent(profile)}`, body);

      this.alert(
        win,
        "Paper Acquisition",
        [
          `Profile: ${result.profile || profile}`,
          `Label: ${result.label || "unknown"}`,
          `Login URL: ${result.loginUrl || "unknown"}`,
          `CDP: ${result.cdpURL || "unknown"}`,
          `ZeroOmega: ${result.zeroOmegaProfile || "not configured"}`,
          `Browser profile: ${result.userDataDir || "unknown"}`
        ].join("\n")
      );
    },

    cleanField(value) {
      if (value === false || value == null) return "";
      return String(value).trim();
    },

    async handleResult(item, result) {
      const status = result.status || "failed";

      if (status === "ok") {
        const pdfPath = result.pdfPath || result.pdf_path;
        if (!pdfPath) {
          throw new Error("Acquisition service returned ok without pdfPath.");
        }
        await Zotero.Attachments.importFromFile({
          file: pdfPath,
          parentItemID: item.id,
          title: result.title ? `Full Text PDF - ${result.title}` : "Full Text PDF"
        });
        await this.addProvenanceNote(item, result);
        await this.setOnlyStatusTag(item, "pdf:acquired");
        return "acquired";
      }

      if (status === "login_required") {
        await this.setOnlyStatusTag(item, "pdf:login-required");
        return "loginRequired";
      }

      if (status === "cooldown") {
        await this.setOnlyStatusTag(item, "pdf:cooldown");
        return "cooldown";
      }

      if (status === "human_verification_required" || status === "captcha_stop") {
        await this.setOnlyStatusTag(item, "pdf:captcha-stop");
        return "captchaStop";
      }

      if (status === "missing_metadata") {
        await this.setOnlyStatusTag(item, "pdf:missing-metadata");
        return "missingMetadata";
      }

      await this.setOnlyStatusTag(item, "pdf:failed");
      return "failed";
    },

    async pollJob(serviceURL, jobId) {
      const started = Date.now();
      const interval = Number(this.getPref("pollIntervalMS", 1500));
      const timeout = Number(this.getPref("jobTimeoutMS", 600000));

      while (Date.now() - started < timeout) {
        const result = await this.getJSON(`${serviceURL}/api/jobs/${encodeURIComponent(jobId)}`);
        if (!["queued", "running"].includes(result.status)) {
          return result;
        }
        await this.delay(interval);
      }

      throw new Error(`Acquisition job timed out after ${Math.round(timeout / 1000)} seconds.`);
    },

    async hasPdfAttachment(item) {
      let attachmentIDs = [];
      try {
        attachmentIDs = item.getAttachments() || [];
      }
      catch {
        return false;
      }

      for (let id of attachmentIDs) {
        const attachment = Zotero.Items.get(id);
        if (!attachment) continue;

        const contentType = attachment.attachmentContentType || "";
        if (String(contentType).toLowerCase() === "application/pdf") return true;

        try {
          const filePath = await attachment.getFilePathAsync();
          if (filePath && String(filePath).toLowerCase().endsWith(".pdf")) return true;
        }
        catch {
          // Linked or missing attachments may not expose a readable path.
        }
      }
      return false;
    },

    async setOnlyStatusTag(item, tag) {
      for (let statusTag of STATUS_TAGS) {
        if (statusTag !== tag) {
          try {
            item.removeTag(statusTag);
          }
          catch {
            // Older Zotero builds may throw if the tag does not exist.
          }
        }
      }
      item.addTag(tag);
      await item.saveTx();
    },

    async addProvenanceNote(parentItem, result) {
      const lines = [
        "PDF acquired by local paper-acquisition service.",
        `Route: ${this.escapeHTML(result.route || result.profile || "unknown")}`,
        `Provider: ${this.escapeHTML(result.provider || "unknown")}`,
        `Access mode: ${this.escapeHTML(result.accessMode || result.access_mode || "unknown")}`,
        `Time: ${this.escapeHTML(new Date().toISOString())}`
      ];

      const note = new Zotero.Item("note");
      note.libraryID = parentItem.libraryID;
      note.parentID = parentItem.id;
      note.setNote(`<p>${lines.join("<br/>")}</p>`);
      await note.saveTx();
    },

    escapeHTML(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    async postJSON(url, payload) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return await this.parseResponse(response);
    },

    async getJSON(url) {
      const response = await fetch(url);
      return await this.parseResponse(response);
    },

    async parseResponse(response) {
      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        }
        catch {
          data = { status: "failed", error: text };
        }
      }
      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }
      return data;
    },

    getServiceURL() {
      return String(this.getPref("serviceURL", "http://127.0.0.1:24372")).replace(/\/+$/, "");
    },

    getPref(name, fallback) {
      try {
        const value = Zotero.Prefs.get(`${this.prefRoot}.${name}`, true);
        return value === undefined ? fallback : value;
      }
      catch {
        return fallback;
      }
    },

    delay(ms) {
      if (Zotero.Promise && typeof Zotero.Promise.delay === "function") {
        return Zotero.Promise.delay(ms);
      }
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    formatSummary(summary) {
      return [
        `Acquired: ${summary.acquired}`,
        `Skipped existing PDFs: ${summary.skipped}`,
        `Login required: ${summary.loginRequired}`,
        `Cooldown: ${summary.cooldown}`,
        `CAPTCHA stop: ${summary.captchaStop}`,
        `Missing metadata: ${summary.missingMetadata}`,
        `Failed: ${summary.failed}`
      ].join("\n");
    },

    alert(win, title, message) {
      try {
        Services.prompt.alert(win, title, message);
      }
      catch {
        win.alert(`${title}\n\n${message}`);
      }
    },

    promptText(win, title, message, defaultValue = "") {
      const input = { value: defaultValue };
      try {
        const ok = Services.prompt.prompt(win, title, message, input, null, {});
        return ok ? String(input.value || "").trim() : "";
      }
      catch {
        const value = win.prompt(message, defaultValue);
        return value ? String(value).trim() : "";
      }
    },

    log(message) {
      try {
        Zotero.debug(`[paper-acquisition] ${message}`);
      }
      catch {
        // Zotero is not ready yet.
      }
    }
  };
})();

function install() {}

function uninstall() {}

async function startup(data, reason) {
  PaperAcquisitionAntiScrape.startup(data, reason);
}

function shutdown(data, reason) {
  PaperAcquisitionAntiScrape.shutdown(data, reason);
  PaperAcquisitionAntiScrape = undefined;
}

function onMainWindowLoad(event) {
  PaperAcquisitionAntiScrape.onMainWindowLoad(event);
}

function onMainWindowUnload(event) {
  PaperAcquisitionAntiScrape.onMainWindowUnload(event);
}
