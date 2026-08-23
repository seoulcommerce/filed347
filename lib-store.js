const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TTL_MS = 24 * 60 * 60 * 1000;
const DIR = "/tmp/filed347";
const mem = new Map();

let blobClient = null;

async function getBlobClient() {
  if (blobClient) return blobClient;
  
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
    sweep();
    return { id: null, persisted: false };
  }
  
  try {
    await blob.put(`filed347/pdf/${id}.pdf`, pdf, {
      access: "private",
      addRandomSuffix: false
    });
    
    await blob.put(`filed347/meta/${id}.json`, JSON.stringify(rec), {
      access: "private",
      addRandomSuffix: false
    });
    
    sweep();
    return { id, persisted: true };
  } catch (err) {
    sweep();
    return { id: null, persisted: false };
  }
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
    const metaResult = await blob.get(`filed347/meta/${key}.json`, { access: 'private' });
    if (!metaResult) return null;
    
    const metaText = await metaResult.text();
    const j = JSON.parse(metaText);
    if (expired(j)) return null;
    
    const pdfResult = await blob.get(`filed347/pdf/${key}.pdf`, { access: 'private' });
    if (!pdfResult) return null;
    
    const pdfBuffer = Buffer.from(await pdfResult.arrayBuffer());
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
    const limitResult = await blob.get(`filed347/preview-limit/${hash}.json`, { access: 'private' });
    if (limitResult) {
      const limitText = await limitResult.text();
      const data = JSON.parse(limitText);
      if (data.used && (Date.now() - data.used) < TTL_MS) {
        mem.set(key, data.used);
        return true;
      }
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
      addRandomSuffix: false
    });
  } catch (_) {}
}

module.exports = { put, get, del, sweep, TTL_MS, DIR, checkPreviewLimit, recordPreview };
// Ensure fresh build with BLOB_STORE_ID env
