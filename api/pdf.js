const { parseForm, filenameFor } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { liveKeys, json, readBody, stripeGet, sessionPaid } = require("../lib-stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }
  const body = readBody(req);
  const { live, secret } = liveKeys();
  const url = new URL(req.url, "http://localhost");
  const sessionId = String(body.session_id || url.searchParams.get("session_id") || "");
  const local = body.local === true || body.test === true || url.searchParams.get("local") === "1";

  if (local && !live) {
    const form = parseForm(body);
    const pdf = buildPdf(form);
    const name = filenameFor(form);
    res.statusCode = 200;
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", 'attachment; filename="' + name + '"');
    res.end(pdf);
    return;
  }

  if (!live) {
    json(res, 503, { error: "stripe_not_live" });
    return;
  }
  if (!sessionId || !sessionId.startsWith("cs_")) {
    json(res, 400, { error: "bad_session" });
    return;
  }
  const { ok, data } = await stripeGet(secret, "/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=subscription");
  if (!ok || !sessionPaid(data)) {
    json(res, 402, { error: "not_paid" });
    return;
  }
  const form = parseForm(body);
  if (data.customer_email && !form.email) form.email = data.customer_email;
  const pdf = buildPdf(form);
  const name = filenameFor(form);
  res.statusCode = 200;
  res.setHeader("content-type", "application/pdf");
  res.setHeader("content-disposition", 'attachment; filename="' + name + '"');
  res.end(pdf);
};
