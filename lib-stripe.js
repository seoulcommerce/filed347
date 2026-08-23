const AMOUNT = 6900;
const CURRENCY = "usd";
const INTERVAL = "month";

function liveKeys() {
  const secret = process.env.STRIPE_SECRET_KEY || "";
  const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  return {
    live: secret.startsWith("sk_live_") && publishable.startsWith("pk_live_"),
    secret,
    publishable
  };
}

function publicOrigin(req) {
  const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!host) return "";
  return proto + "://" + host;
}

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  return body && typeof body === "object" ? body : {};
}

async function stripeForm(secret, path, params) {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.append(k, String(v));
  }
  const r = await fetch("https://api.stripe.com/v1" + path, {
    method: "POST",
    headers: {
      authorization: "Bearer " + secret,
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

async function stripeGet(secret, path) {
  const r = await fetch("https://api.stripe.com/v1" + path, {
    headers: { authorization: "Bearer " + secret }
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

function sessionPaid(data) {
  if (!data) return false;
  const sub = data.subscription;
  const status = (sub && sub.status) || data.status || "";
  return status === "active" || status === "trialing" || data.payment_status === "paid";
}

module.exports = {
  AMOUNT, CURRENCY, INTERVAL,
  liveKeys, publicOrigin, json, readBody,
  stripeForm, stripeGet, sessionPaid
};
