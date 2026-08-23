const { parseForm } = require("../lib-form");
const {
  AMOUNT, CURRENCY, INTERVAL, liveKeys, publicOrigin, json, readBody, stripeForm
} = require("../lib-stripe");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }
  const { live, secret } = liveKeys();
  if (!live) {
    json(res, 503, { error: "stripe_not_live", detail: "Need sk_live_ and pk_live_ in Vercel env. No checkout session was created." });
    return;
  }
  const body = readBody(req);
  const form = parseForm(body);
  const formId = String(body.formId || body.id || "").replace(/[^a-f0-9]/g, "").slice(0, 32);
  if (!form.email || !form.email.includes("@")) {
    json(res, 400, { error: "Need an email for Stripe" });
    return;
  }
  const origin = publicOrigin(req);
  if (!origin) {
    json(res, 500, { error: "missing_origin" });
    return;
  }
  const params = {
    mode: "subscription",
    customer_email: form.email,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": CURRENCY,
    "line_items[0][price_data][unit_amount]": String(AMOUNT),
    "line_items[0][price_data][recurring][interval]": INTERVAL,
    "line_items[0][price_data][product_data][name]": "Filed347 weekly WH-347",
    success_url: origin + "/thanks.html?session_id={CHECKOUT_SESSION_ID}" + (formId ? "&id=" + formId : ""),
    cancel_url: origin + "/",
    "metadata[product]": "filed347",
    "metadata[email]": form.email.slice(0, 500),
    "subscription_data[metadata][product]": "filed347"
  };
  if (formId) {
    params["metadata[formId]"] = formId;
    params["subscription_data[metadata][formId]"] = formId;
  }
  const { ok, data } = await stripeForm(secret, "/checkout/sessions", params);
  if (!ok || !data.url) {
    console.log("filed347_checkout_fail", data && data.error);
    json(res, 502, { error: "checkout_failed" });
    return;
  }
  json(res, 200, { url: data.url });
};
