#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const HOST = process.env.PAA_HOST || "127.0.0.1";
const PORT = Number(process.env.PAA_PORT || 24372);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_DOWNLOAD_DIR = path.join(os.homedir(), ".paper-acquisition", "downloads");
const DOWNLOAD_DIR = path.resolve(process.env.PAA_DOWNLOAD_DIR || DEFAULT_DOWNLOAD_DIR);
const PROFILES_DIR = path.resolve(process.env.PAA_PROFILES_DIR || path.join(os.homedir(), ".paper-acquisition", "profiles"));
const BROWSER_FALLBACK = path.resolve(process.env.PAA_BROWSER_FALLBACK || path.join(REPO_ROOT, "scripts", "browser-fallback.js"));

const jobs = new Map();

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

function notFound(res) {
  json(res, 404, { status: "not_found" });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      }
      catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on("error", reject);
  });
}

function cleanIdentifier(body) {
  const candidates = [body.doi, body.url, body.identifier].filter(Boolean);
  for (const value of candidates) {
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function makeJob(body) {
  const id = `job_${crypto.randomBytes(12).toString("hex")}`;
  const now = new Date().toISOString();
  const job = {
    jobId: id,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    request: sanitizeRequest(body)
  };
  jobs.set(id, job);
  return job;
}

function sanitizeRequest(body) {
  return {
    zoteroItemKey: body.zoteroItemKey || "",
    doi: body.doi || "",
    title: body.title || "",
    url: body.url || "",
    profile: body.profile || "auto",
    mode: body.mode || "manual"
  };
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

async function runAcquireJob(job, body) {
  updateJob(job, { status: "running" });

  const identifier = cleanIdentifier(body);
  if (!identifier) {
    updateJob(job, {
      status: "missing_metadata",
      error: "No DOI, URL, or identifier was provided. Title-only acquisition needs a scansci-pdf search adapter."
    });
    return;
  }

  if (!fs.existsSync(BROWSER_FALLBACK)) {
    updateJob(job, {
      status: "failed",
      error: `Browser fallback script not found: ${BROWSER_FALLBACK}`
    });
    return;
  }

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });

  const env = {
    ...process.env,
    OUTPUT_DIR: DOWNLOAD_DIR
  };

  const result = await spawnJSON(process.execPath, [BROWSER_FALLBACK, identifier], {
    cwd: REPO_ROOT,
    env,
    timeoutMS: Number(process.env.PAA_JOB_TIMEOUT_MS || 600000)
  });

  if (result.exitCode !== 0 && !result.json) {
    updateJob(job, {
      status: "failed",
      error: result.stderr || result.stdout || `Acquisition command exited with ${result.exitCode}`
    });
    return;
  }

  const data = result.json || {};
  const status = normalizeStatus(data.status || (result.exitCode === 0 ? "ok" : "failed"));

  updateJob(job, {
    ...data,
    originalStatus: data.status || "",
    status,
    pdfPath: data.pdf_path || data.pdfPath || "",
    stderr: trimLog(result.stderr)
  });
}

function normalizeStatus(status) {
  if (status === "no_institutional_access") return "login_required";
  if (status === "human_verification_required") return "human_verification_required";
  return status || "failed";
}

function spawnJSON(command, args, options) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      child.kill("SIGTERM");
    }, options.timeoutMS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: trimLog(stdout),
        stderr: trimLog(stderr),
        json: parseLastJSON(stdout)
      });
    });
    child.on("error", (err) => {
      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stdout: trimLog(stdout),
        stderr: `${stderr}\n${err.message}`.trim(),
        json: null
      });
    });
  });
}

function parseLastJSON(stdout) {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]);
    }
    catch {
      // Continue scanning for the last JSON line.
    }
  }
  return null;
}

function trimLog(value) {
  return String(value || "").slice(-8000);
}

function safeProfileName(profile) {
  const safe = String(profile || "default").replace(/[^a-z0-9_.-]+/gi, "-").replace(/^-+|-+$/g, "");
  return safe || "default";
}

async function startLoginProfile(profile, body) {
  const safeProfile = safeProfileName(profile);
  const chrome = process.env.CHROME_BIN || detectChrome();
  if (!chrome) {
    throw new Error("Chrome/Chromium was not found. Set CHROME_BIN to enable profile login.");
  }

  const userDataDir = path.join(PROFILES_DIR, safeProfile, "chrome");
  fs.mkdirSync(userDataDir, { recursive: true });

  const port = Number(body.cdpPort || process.env.CDP_PORT || 9222);
  const startURL = body.loginUrl || "about:blank";

  const child = spawn(chrome, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--new-window",
    startURL
  ], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  return {
    status: "ok",
    profile: safeProfile,
    cdpURL: `http://127.0.0.1:${port}`,
    userDataDir
  };
}

function detectChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function resolverResponse(doi) {
  const safe = String(doi || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safe) return null;
  const expected = path.join(DOWNLOAD_DIR, `doi-${safe}.pdf`);
  if (!fs.existsSync(expected)) return null;
  return {
    status: "ok",
    pdfPath: expected,
    pdfURL: `file://${expected}`
  };
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, {
      status: "ok",
      service: "paper-acquisition-zotero-service",
      browserFallback: BROWSER_FALLBACK,
      downloadDir: DOWNLOAD_DIR
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/acquire") {
    try {
      const body = await readBody(req);
      const job = makeJob(body);
      json(res, 202, { status: "queued", jobId: job.jobId });
      runAcquireJob(job, body).catch((err) => {
        updateJob(job, { status: "failed", error: err.message });
      });
    }
    catch (err) {
      json(res, 400, { status: "failed", error: err.message });
    }
    return;
  }

  const jobMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)$/);
  if (req.method === "GET" && jobMatch) {
    const job = jobs.get(decodeURIComponent(jobMatch[1]));
    if (!job) {
      notFound(res);
      return;
    }
    json(res, 200, job);
    return;
  }

  const loginMatch = url.pathname.match(/^\/api\/login\/([^/]+)$/);
  if (req.method === "POST" && loginMatch) {
    try {
      const body = await readBody(req);
      const result = await startLoginProfile(decodeURIComponent(loginMatch[1]), body);
      json(res, 200, result);
    }
    catch (err) {
      json(res, 500, { status: "failed", error: err.message });
    }
    return;
  }

  const resolverMatch = url.pathname.match(/^\/api\/resolver\/(.+)$/);
  if (req.method === "GET" && resolverMatch) {
    const result = resolverResponse(decodeURIComponent(resolverMatch[1]));
    if (!result) {
      json(res, 404, { status: "not_found" });
      return;
    }
    json(res, 200, result);
    return;
  }

  notFound(res);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    json(res, 500, { status: "failed", error: err.message });
  });
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    status: "ok",
    service: "paper-acquisition-zotero-service",
    url: `http://${HOST}:${PORT}`,
    downloadDir: DOWNLOAD_DIR
  }));
});
