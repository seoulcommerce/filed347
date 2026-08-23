const { readBody, json } = require("../lib-stripe");
const store = require("../lib-store");

function clean(s) {
  return String(s == null ? "" : s).trim();
}

function looksLikePayrollData(text) {
  const lower = text.toLowerCase();
  // Check for CSV-like patterns
  if (/employee.*,.*name/i.test(text) || /worker.*,.*hours/i.test(text)) return true;
  // Check for multiple commas per line (CSV indicator)
  const lines = text.split("\n");
  const csvLikeLines = lines.filter(l => (l.match(/,/g) || []).length >= 3);
  if (csvLikeLines.length > 2) return true;
  // Check for SSN-like patterns (9 consecutive digits)
  if (/\b\d{9}\b/.test(text)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }

  const body = readBody(req);
  const name = clean(body.name).slice(0, 100);
  const replyEmail = clean(body.replyEmail).slice(0, 200);
  const message = clean(body.message).slice(0, 2000);

  if (!name || name.length < 2) {
    json(res, 400, { error: "Name required (at least 2 characters)" });
    return;
  }

  if (!replyEmail || !replyEmail.includes("@")) {
    json(res, 400, { error: "Valid reply email required" });
    return;
  }

  if (!message || message.length < 10) {
    json(res, 400, { error: "Message required (at least 10 characters)" });
    return;
  }

  if (looksLikePayrollData(message)) {
    json(res, 400, { error: "Do not send payroll data, employee names, or SSNs. This is not a payroll inbox." });
    return;
  }

  const contactMessage = {
    name,
    replyEmail,
    message,
    receivedAt: new Date().toISOString()
  };

  // Store contact message with 30-day TTL
  const id = store.put(contactMessage, null, "contact-" + Date.now() + ".json", 30 * 24 * 60 * 60 * 1000);

  json(res, 200, { ok: true, id });
};
