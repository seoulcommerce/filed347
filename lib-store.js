const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TTL_MS = 24 * 60 * 60 * 1000;
const DIR = "/tmp/filed347";
const mem = new Map();

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch (_) {}
}

function expired(rec) {
  const ttl = rec && rec.ttl ? rec.ttl : TTL_MS;
  return !rec || !rec.createdAt || (Date.now() - rec.createdAt) > ttl;
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

function put(a, b, c, customTtl) {
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
  const ttl = typeof customTtl === "number" ? customTtl : TTL_MS;
  const safe = Object.assign({}, form || {}, { csv: "" });
  const rec = { id, createdAt, ttl, form: safe, name: name || "filed347-wh347.pdf" };
  mem.set(id, Object.assign({}, rec, { pdf }));
  ensureDir();
  try {
    fs.writeFileSync(path.join(DIR, id + ".json"), JSON.stringify(rec));
    fs.writeFileSync(path.join(DIR, id + ".pdf"), pdf);
  } catch (_) {}
  sweep();
  return id;
}

function get(id) {
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
  } catch (_) {
    return null;
  }
}

module.exports = { put, get, del, sweep, TTL_MS, DIR };
