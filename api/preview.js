const { parseForm } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { liveKeys, json, readBody } = require("../lib-stripe");
const store = require("../lib-store");
const { hasUsedPreview, markPreviewUsed } = require("../lib-preview-limit");

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

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
         req.headers["x-real-ip"] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         "unknown";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  const { live } = liveKeys();
  const clientIp = getClientIp(req);

  // When live=true, limit to one preview per client per 24h
  if (live) {
    if (hasUsedPreview(clientIp)) {
      json(res, 402, { error: "preview_limit_reached", message: "You have used your free preview. Subscribe for unlimited PDF generation." });
      return;
    }
  }

  const body = readBody(req);
  const form = parseForm(body);
  const pdf = buildPdf(form);
  const name = filenameFor(form);
  const id = store.put(form, pdf, name);
  
  // Mark preview as used when live=true
  if (live) {
    markPreviewUsed(clientIp);
  }
  
  sendPdf(res, pdf, name, id);
};
