const fs = require("fs");
const path = require("path");
const { parseForm, filenameFor, last4, looksLikeSsn } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");

function fail(msg) {
  console.error("FAIL", msg);
  process.exit(1);
}

const pages = ["index.html", "thanks.html", "privacy.html", "terms.html"].map((f) => {
  const p = path.join(__dirname, "..", f);
  return { f, html: fs.readFileSync(p, "utf8") };
});
for (const { f, html } of pages) {
  if (/File this week/i.test(html)) fail(f + " still has File this week.");
  if (/mailto:[^"'>\s]*seoulwebdesign/i.test(html)) fail(f + " has seoulwebdesign mailto");
}
const landing = pages[0].html;
if (!landing.includes("Generate the WH-347")) fail("landing missing CTA Generate the WH-347");
if (!landing.includes("Checkout is not live. No charge can be made. The sample PDF and sample CSV are free to open.")) {
  fail("landing missing Stripe-off caption");
}
if (!landing.includes('href="/sample-wh347.pdf"') || !landing.includes('href="/sample.csv"')) {
  fail("landing missing sample links");
}
if (!landing.includes("The CSV is read in your browser.")) fail("landing missing Quill CSV sentence");
if (!landing.includes("The server sees the CSV only in the request that builds the PDF. That request is not written to a payroll database or a disk folder in this product.")) {
  fail("landing missing Quill retention sentence");
}
if (!landing.includes("After that request ends, we do not keep the CSV.")) fail("landing missing after-request sentence");
if (/if \(!stripeLive\) \{\s*go\.disabled = true/m.test(landing)) {
  fail("Generate is disabled when Stripe is off");
}
if (landing.includes("COLUMN-MAPPING")) fail("landing must not treat COLUMN-MAPPING as a sample");

const pdfApi = fs.readFileSync(path.join(__dirname, "..", "api", "pdf.js"), "utf8");
if (pdfApi.includes("stripe_not_live") || pdfApi.includes("503")) fail("api/pdf still has a Stripe gate");
if (!pdfApi.includes('url.searchParams.get("sample")') || !pdfApi.includes('url.searchParams.get("id")')) {
  fail("api/pdf missing GET sample/id");
}

const store = fs.readFileSync(path.join(__dirname, "..", "lib-store.js"), "utf8");
if (/writeFileSync\([^\n]*\.json/.test(store)) fail("store writes json form");
if (store.includes("JSON.stringify") && store.includes("form")) fail("store persists form");
if (!store.includes("Never the CSV")) fail("store must refuse CSV");

if (last4("123-45-6789") !== "6789") fail("last4 dashed");
if (last4("123456789") !== "6789") fail("last4 9-digit");
if (looksLikeSsn("123456789") !== true) fail("looksLikeSsn 9");
if (looksLikeSsn("0001")) fail("looksLikeSsn last4");

const csvPath = path.join(__dirname, "..", "sample.csv");
const csv = fs.readFileSync(csvPath, "utf8");
const form = parseForm({
  email: "sample@example.com",
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
  officialPhone: "555-0100",
  officialEmail: "sample-official@example.com",
  role: "subcontractor",
  finalPayroll: true,
  csv
});

if (form.workers.length < 10) fail("expected 10 SAMPLE workers, got " + form.workers.length);
for (const w of form.workers) {
  if (!/^SAMPLE/i.test(w.last) && !/^SAMPLE/i.test(w.first) && !/^SAMPLE/i.test(w.classification)) {
    fail("worker is not marked SAMPLE " + JSON.stringify(w));
  }
  if (w.id.length > 4) fail("identifying no longer than last4 " + w.id);
}
if (form.role !== "subcontractor" || form.finalPayroll !== true) fail("role/finalPayroll " + form.role + " " + form.finalPayroll);

const pdf = buildPdf(form);
const out = path.join(__dirname, "..", "test-wh347.pdf");
fs.writeFileSync(out, pdf);
const head = pdf.slice(0, 8).toString("latin1");
if (!head.startsWith("%PDF-")) fail("not a PDF " + JSON.stringify(head));
if (pdf.length < 2000) fail("too small " + pdf.length);
const asText = pdf.toString("latin1");
const need = [
  "WH-347",
  "STATEMENT OF COMPLIANCE",
  "Worker last / first",
  "SAMPLE County Culvert",
  "SAMPLE WD - not a real determination",
  "Filed347 generated this from your CSV. Not a legal opinion. You must review and sign. Software, no human queue.",
  "I paid or supervised the payment of the laborers or mechanics",
  "29 CFR part 3",
  "Certification boxes on page 2 are not marked",
  "[X] Subcontractor",
  "[ ] Prime",
  "[X] Yes"
];
for (const n of need) {
  if (!asText.includes(n)) fail("missing text: " + n);
}
if (/\d{3}-\d{2}-\d{4}/.test(asText) || /(?<!\d)\d{9}(?!\d)/.test(asText)) fail("9-digit SSN pattern in PDF");

const primeForm = parseForm({
  contractor: form.contractor,
  address: form.address,
  project: form.project,
  contractNo: form.contractNo,
  location: form.location,
  weekEnding: form.weekEnding,
  payrollNo: form.payrollNo,
  wageDetermination: form.wageDetermination,
  officialName: form.officialName,
  officialTitle: form.officialTitle,
  role: "prime",
  finalPayroll: true,
  csv
});
const primePdf = buildPdf(primeForm).toString("latin1");
if (!primePdf.includes("[X] Prime") || !primePdf.includes("[ ] Subcontractor") || !primePdf.includes("[X] Yes")) {
  fail("prime/final boxes not marked from fields");
}

console.log(
  "OK",
  out,
  "bytes=" + pdf.length,
  "head=" + head,
  "workers=" + form.workers.length,
  "name=" + filenameFor(form)
);
