const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TTL_MS = 60 * 60 * 1000;
const DIR = "/tmp/filed347-pdf";
const mem = new Map();

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
  try { fs.unlinkSync(path.join(DIR, id + ".pdf")); } catch (_) {}
  try { fs.unlinkSync(path.join(DIR, id + ".name")); } catch (_) {}
}

function sweep() {
  for (const [k, v] of mem) {
    if (expired(v)) del(k);
  }
}

function asPdf(x) {
  if (Buffer.isBuffer(x)) return x;
  if (x && typeof x === "object" && x.type === "Buffer" && Array.isArray(x.data)) return Buffer.from(x.data);
  if (typeof x === "string") return Buffer.from(x, "latin1");
  return null;
}

// Persist PDF bytes + filename only. Never the CSV. Never the form.
// Accept put(pdf, name) or put(ignoredForm, pdf, name).
function put(a, b, c) {
  let pdf = asPdf(a);
  let name = typeof b === "string" ? b : "";
  if (!pdf) {
    pdf = asPdf(b);
    name = typeof c === "string" ? c : name;
  }
  if (!pdf) pdf = Buffer.from("%PDF-1.4\n%%EOF\n");
  const id = newId();
  const rec = { id, createdAt: Date.now(), name: name || "filed347-wh347.pdf", pdf };
  mem.set(id, rec);
  ensureDir();
  try {
    fs.writeFileSync(path.join(DIR, id + ".pdf"), pdf);
    fs.writeFileSync(path.join(DIR, id + ".name"), rec.name);
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
    const pdf = fs.readFileSync(path.join(DIR, key + ".pdf"));
    let name = "filed347-wh347.pdf";
    try { name = fs.readFileSync(path.join(DIR, key + ".name"), "utf8"); } catch (_) {}
    rec = { id: key, name, pdf, createdAt: Date.now() };
    mem.set(key, rec);
    return rec;
  } catch (_) {
    return null;
  }
}

module.exports = { put, get, del, sweep, TTL_MS, DIR };
