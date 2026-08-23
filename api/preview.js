const { parseForm } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { liveKeys, json, readBody } = require("../lib-stripe");
const store = require("../lib-store");

function sendPdf(res, pdf, name, id) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", 'attachment; filename="' + String(name || "filed347-wh347.pdf").replace(/"/g, "") + '"');
  if (id) {
    res.setHeader("x-form-id", id);
    res.setHeader("x-filed347-id", id);
    res.setHeader("access-control-expose-headers", "x-form-id, x-filed347-id");
  }
  res.end(pdf);
}

function filenameFor(form) {
  const bit = [form.project, form.weekEnding, form.payrollNo].filter(Boolean).join("-") || "preview";
  return "filed347-preview-" + bit.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) + ".pdf";
}

function hashForm(form) {
  const crypto = require("crypto");
  const str = JSON.stringify({
    contractor: form.contractor || "",
    project: form.project || "",
    weekEnding: form.weekEnding || ""
  });
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  const { live } = liveKeys();
  const body = readBody(req);
  const form = parseForm(body);

  if (live) {
    const identifier = hashForm(form);
    const hasUsed = await store.checkPreviewLimit(identifier);
    if (hasUsed) {
      json(res, 429, { error: "preview_limit_reached", message: "You have used your free preview. Subscribe for unlimited PDF generation." });
      return;
    }
    await store.recordPreview(identifier);
  }

  const pdf = buildPdf(form, { watermark: true });
  const name = filenameFor(form);
  const id = await store.put(form, pdf, name);
  
  sendPdf(res, pdf, name, id);
};
