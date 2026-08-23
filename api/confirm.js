const { liveKeys, json, stripeGet, sessionPaid } = require("../lib-stripe");

module.exports = async function handler(req, res) {
  const { live, secret } = liveKeys();
  if (!live) {
    json(res, 503, { paid: false, error: "stripe_not_live" });
    return;
  }
  const url = new URL(req.url, "http://localhost");
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId || !sessionId.startsWith("cs_")) {
    json(res, 400, { paid: false, error: "bad_session" });
    return;
  }
  const { ok, data } = await stripeGet(secret, "/checkout/sessions/" + encodeURIComponent(sessionId) + "?expand[]=subscription");
  if (!ok) {
    json(res, 502, { paid: false, error: "session_lookup_failed" });
    return;
  }
  const paid = sessionPaid(data);
  json(res, 200, {
    paid,
    email: (data.customer_details && data.customer_details.email) || data.customer_email || (data.metadata && data.metadata.email) || "",
    product: "filed347"
  });
};
