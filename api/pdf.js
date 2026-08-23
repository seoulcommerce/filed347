const fs = require("fs");
const path = require("path");
const { parseForm, filenameFor } = require("../lib-form");
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
  }
  res.end(pdf);
}

function samplePdf() {
  const candidates = [
    path.join(__dirname, "..", "public", "sample-wh347.pdf"),
    path.join(__dirname, "..", "sample-wh347.pdf"),
    path.join(__dirname, "..", "test-wh347.pdf")
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return fs.readFileSync(p); } catch (_) {}
  }
  const csvPath = path.join(__dirname, "..", "sample.csv");
  let csv = "";
  try { csv = fs.readFileSync(csvPath, "utf8"); } catch (_) {}
  return buildPdf(parseForm({
    contractor: "SAMPLE Sub LLC - not a real contractor",
    address: "100 SAMPLE Yard Rd, Sampleville, ST 00000",
    project: "SAMPLE County Culvert - not a real job",
    contractNo: "SAMPLE-000",
    location: "SAMPLE County, ST",
    weekEnding: "2026-08-22",
    payrollNo: "1",
    wageDetermination: "SAMPLE WD - not a real determination",
    officialName: "SAMPLE Official",
    officialTitle: "SAMPLE Payroll clerk",
    role: "subcontractor",
    finalPayroll: false,
    csv
  }));
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const { live, secret } = liveKeys();

  if (req.method === "GET") {
    if (url.searchParams.get("sample") === "1") {
      sendPdf(res, samplePdf(), "sample-wh347.pdf");
      return;
    }
    const id = url.searchParams.get("id") || "";
    if (id) {
      const rec = await store.get(id);
      if (!rec || !rec.pdf) {
        json(res, 404, { error: "not_found" });
        return;
      }
      sendPdf(res, rec.pdf, rec.name || filenameFor(rec.form || {}), rec.id);
      return;
    }
    json(res, 400, { error: "need_id_or_sample" });
    return;
  }

  if (req.method !== "POST") {
    json(res, 405, { error: "GET or POST" });
    return;
  }

  // POST /api/pdf is now gated when live=true
  // Use /api/preview for unpaid preview or /api/generate for paid generation
  if (live) {
    json(res, 402, { error: "payment_required", message: "Use /api/preview for unpaid preview or /api/generate with a paid session" });
    return;
  }

  // When live=false, allow POST for QA/testing
  const body = readBody(req);
  const form = parseForm(body);
  const pdf = buildPdf(form);
  const name = filenameFor(form);
  const id = store.put(form, pdf, name);
  sendPdf(res, pdf, name, id);
};
