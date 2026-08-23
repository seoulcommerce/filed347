const { parseForm } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { liveKeys, json, readBody, stripeGet, sessionPaid } = require("../lib-stripe");
const store = require("../lib-store");

function sendPdf(res, pdf, name, id) {
  res.statusCode = 200;
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", 'attachment; filename="' + String(name || "filed347-wh347.pdf").replace(/"/g, "") + '"');
  if (id) {
    res.setHeader("x-form-id", id);
    res.setHeader("x-filed347-id", id);
    res.setHeader("access-control-expose-headers", "x-form-id, x-filed347-id");
  } else {
    res.setHeader("x-filed347-persist", "unavailable");
    res.setHeader("access-control-expose-headers", "x-filed347-persist");
  }
  res.end(pdf);
}

function filenameFor(form) {
  const bit = [form.project, form.weekEnding, form.payrollNo].filter(Boolean).join("-") || "payroll";
  return "filed347-wh347-" + bit.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) + ".pdf";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  const url = new URL(req.url, "http://localhost");
  const { live, secret } = liveKeys();

  const body = readBody(req);
  const sessionId = String(body.session_id || url.searchParams.get("session_id") || "");

  if (live && !sessionId) {
    json(res, 402, { error: "payment_required" });
    return;
  }

  if (sessionId && live) {
    const { ok, data } = await stripeGet(secret, "/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=subscription");
    if (!ok || !sessionPaid(data)) {
      json(res, 402, { error: "not_paid" });
      return;
    }
  }

  const form = parseForm(body);
  const pdf = buildPdf(form, { watermark: false });
  const name = filenameFor(form);
  
  const result = await store.put(form, pdf, name);
  sendPdf(res, pdf, name, result.persisted ? result.id : null);
};
