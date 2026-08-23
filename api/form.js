const { parseForm, filenameFor } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");
const { json, readBody } = require("../lib-stripe");
const store = require("../lib-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "POST only" });
    return;
  }
  const body = readBody(req);
  const form = parseForm(body);
  if (!form.workers || !form.workers.length) {
    json(res, 400, { error: "need_payroll_csv" });
    return;
  }
  const pdf = buildPdf(form);
  const name = filenameFor(form);
  const id = store.put(pdf, name);
  json(res, 200, { id, name, workers: form.workers.length });
};
