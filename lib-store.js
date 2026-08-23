const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TTL_MS = 24 * 60 * 60 * 1000;
const DIR = "/tmp/filed347";
const mem = new Map();

let blobClient = null;

async function getBlobClient() {
  if (blobClient) return blobClient;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }
  try {
    const { put, get, del, list } = require("@vercel/blob");
    blobClient = { put, get, del, list };
    return blobClient;
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
  const rec = { id, createdAt, form: safe, name: name || "filed347-wh347.pdf" };
  
  mem.set(id, Object.assign({}, rec, { pdf }));
  
  ensureDir();
  try {
    fs.writeFileSync(path.join(DIR, id + ".json"), JSON.stringify(rec));
    fs.writeFileSync(path.join(DIR, id + ".pdf"), pdf);
  } catch (_) {}
  
  const blob = await getBlobClient();
  if (!blob) {
    throw new Error("BLOB_READ_WRITE_TOKEN not configured. PDF cannot be stored for cross-lambda retrieval.");
  }
  
  try {
    await blob.put(`filed347/pdf/${id}.pdf`, pdf, {
      access: "private",
      addRandomSuffix: false,
      cacheControlMaxAge: TTL_MS / 1000
    });
    
    await blob.put(`filed347/meta/${id}.json`, JSON.stringify(rec), {
      access: "private",
      addRandomSuffix: false,
      cacheControlMaxAge: TTL_MS / 1000
    });
  } catch (err) {
    throw new Error(`Failed to store PDF in blob: ${err.message}`);
  }
  
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
  
  const blob = await getBlobClient();
  if (!blob) return null;
  
  try {
    const metaResp = await fetch(`https://blob.vercel-storage.com/filed347/meta/${key}.json`);
    if (!metaResp.ok) return null;
    
    const j = await metaResp.json();
    if (expired(j)) return null;
    
    const pdfResp = await fetch(`https://blob.vercel-storage.com/filed347/pdf/${key}.pdf`);
    if (!pdfResp.ok) return null;
    
    const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());
    rec = Object.assign({}, j, { pdf: pdfBuffer });
    mem.set(key, rec);
    return rec;
  } catch (_) {
    return null;
  }
}

async function checkPreviewLimit(identifier) {
  const key = "preview_limit:" + identifier;
  
  const cached = mem.get(key);
  if (cached && Date.now() - cached < TTL_MS) {
    return true;
  }
  
  const blob = await getBlobClient();
  if (!blob) return false;
  
  try {
    const hash = crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 16);
    const resp = await fetch(`https://blob.vercel-storage.com/filed347/preview-limit/${hash}.json`);
    if (resp.ok) {
      mem.set(key, Date.now());
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
}

async function recordPreview(identifier) {
  const key = "preview_limit:" + identifier;
  const now = Date.now();
  mem.set(key, now);
  
  const blob = await getBlobClient();
  if (!blob) return;
  
  try {
    const hash = crypto.createHash("sha256").update(identifier).digest("hex").slice(0, 16);
    await blob.put(`filed347/preview-limit/${hash}.json`, JSON.stringify({ used: now }), {
      access: "private",
      addRandomSuffix: false,
      cacheControlMaxAge: TTL_MS / 1000
    });
  } catch (_) {}
}

module.exports = { put, get, del, sweep, TTL_MS, DIR, checkPreviewLimit, recordPreview };
