const fs = require("fs");
const path = require("path");
const { parseForm, filenameFor } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { json, readBody } = require("../lib-stripe");
const store = require("../lib-store");

function sendPdf(res, pdf, name, id) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", 'attachment; filename="' + String(name || "filed347-wh347.pdf").replace(/"/g, "") + '"');
  if (id) {
    res.setHeader("x-filed347-id", id);
    res.setHeader("x-form-id", id);
    res.setHeader("access-control-expose-headers", "x-filed347-id, x-form-id");
  }
  res.end(pdf);
}

function samplePdfFile() {
  const p = path.join(__dirname, "..", "sample-wh347.pdf");
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch (_) {}
  return null;
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET") {
    if (url.searchParams.get("sample") === "1") {
      const buf = samplePdfFile();
      if (!buf) {
        json(res, 404, { error: "sample_missing" });
        return;
      }
      sendPdf(res, buf, "sample-wh347.pdf");
      return;
    }
    const id = url.searchParams.get("id") || "";
    if (id) {
      const rec = store.get(id);
      if (!rec || !rec.pdf) {
        json(res, 404, { error: "not_found" });
        return;
      }
      sendPdf(res, rec.pdf, rec.name, rec.id);
      return;
    }
    json(res, 400, { error: "need_id_or_sample" });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "GET or POST" });
    return;
  }

  const body = readBody(req);
  const form = parseForm(body);
  const pdf = buildPdf(form);
  const name = filenameFor(form);
  const id = store.put(pdf, name);
  sendPdf(res, pdf, name, id);
};
