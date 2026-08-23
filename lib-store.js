const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TTL_MS = 24 * 60 * 60 * 1000;
const TTL_SEC = 86400;
const DIR = "/tmp/filed347";
const mem = new Map();

let vercelCache = null;

async function getVercelCache() {
  if (vercelCache) return vercelCache;
  try {
    const { getCache } = require("@vercel/functions");
    vercelCache = getCache({ namespace: "filed347" });
    return vercelCache;
  } catch (_) {
    return null;
  }
}

async function getBlobStore() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const { put, get } = require("@vercel/blob");
    return { put, get };
  } catch (_) {
    return null;
  }
}

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}
}

function expired(rec) {
  return !rec || !rec.createdAt || (Date.now() - rec.createdAt) > TTL_MS;
}

function del(id) {
  mem.delete(id);
  try { fs.unlinkSync(path.join(DIR, id + ".json")); } catch (_) {}
  try { fs.unlinkSync(path.join(DIR, id + ".pdf")); } catch (_) {}
}

function sweep() {
  for (const [k, v] of mem) {
    if (expired(v)) del(k);
  }
  try {
    for (const f of fs.readdirSync(DIR)) {
      if (!f.endsWith(".json")) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
        if (expired(j)) del(j.id || f.replace(/\.json$/, ""));
      } catch (_) {}
    }
  } catch (_) {}
}

function asPdf(x) {
  if (Buffer.isBuffer(x)) return x;
  if (x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data)) return Buffer.from(x.data);
  if (typeof x === "string" && x.slice(0, 4) === "%PDF") return Buffer.from(x, "latin1");
  return null;
}

async function put(a, b, c) {
  let form = {};
  let pdf = asPdf(a);
  let name = typeof b === "string" ? b : "";
  if (!pdf) {
    if (a && typeof a === "object") form = a;
    pdf = asPdf(b);
    name = typeof c === "string" ? c : name;
  }
  if (!pdf) pdf = Buffer.from("%PDF-1.4\n%%EOF\n");
  const id = newId();
  const createdAt = Date.now();
  const safe = Object.assign({}, form || {}, { csv: "" });
  // Never the CSV
  const rec = { id, createdAt, form: safe, name: name || "filed347-wh347.pdf" };
  
  mem.set(id, Object.assign({}, rec, { pdf }));
  
  ensureDir();
  try {
    fs.writeFileSync(path.join(DIR, id + ".json"), JSON.stringify(rec));
    fs.writeFileSync(path.join(DIR, id + ".pdf"), pdf);
  } catch (_) {}
  
  try {
    const cache = await getVercelCache();
    if (cache) {
      await cache.set(id + ".json", JSON.stringify(rec), { ttl: TTL_SEC });
      await cache.set(id + ".pdf", pdf.toString("base64"), { ttl: TTL_SEC });
    }
  } catch (_) {}
  
  try {
    const blob = await getBlobStore();
    if (blob) {
      await blob.put(`filed347/${id}.pdf`, pdf, {
        access: "public",
        addRandomSuffix: false
      });
    }
  } catch (_) {}
  
  sweep();
  return id;
}

async function get(id) {
  const key = String(id || "");
  if (!/^[a-f0-9]{16,32}$/.test(key)) return null;
  
  let rec = mem.get(key);
  if (rec && expired(rec)) {
    del(key);
    return null;
  }
  if (rec && rec.pdf) return rec;
  
  try {
    const j = JSON.parse(fs.readFileSync(path.join(DIR, key + ".json"), "utf8"));
    if (expired(j)) {
      del(key);
      return null;
    }
    const pdf = fs.readFileSync(path.join(DIR, key + ".pdf"));
    rec = Object.assign({}, j, { pdf });
    mem.set(key, rec);
    return rec;
  } catch (_) {}
  
  try {
    const cache = await getVercelCache();
    if (cache) {
      const jsonStr = await cache.get(key + ".json");
      const pdfB64 = await cache.get(key + ".pdf");
      if (jsonStr && pdfB64) {
        const j = JSON.parse(jsonStr);
        if (expired(j)) return null;
        const pdf = Buffer.from(pdfB64, "base64");
        rec = Object.assign({}, j, { pdf });
        mem.set(key, rec);
        return rec;
      }
    }
  } catch (_) {}
  
  return null;
}

async function checkPreviewLimit(identifier) {
  const key = "preview_limit:" + identifier;
  
  const cached = mem.get(key);
  if (cached && Date.now() - cached < TTL_MS) {
    return true;
  }
  
  try {
    const cache = await getVercelCache();
    if (cache) {
      const val = await cache.get(key);
      if (val) {
        mem.set(key, Date.now());
        return true;
      }
    }
  } catch (_) {}
  
  return false;
}

async function recordPreview(identifier) {
  const key = "preview_limit:" + identifier;
  const now = Date.now();
  mem.set(key, now);
  
  try {
    const cache = await getVercelCache();
    if (cache) {
      await cache.set(key, "1", { ttl: TTL_SEC });
    }
  } catch (_) {}
}

module.exports = { put, get, del, sweep, TTL_MS, DIR, checkPreviewLimit, recordPreview };
