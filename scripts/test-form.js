const fs = require("fs");
const path = require("path");
const { parseForm, filenameFor } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");

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
  csv
});

if (form.workers.length < 10) {
  console.error("FAIL expected 10 SAMPLE workers, got", form.workers.length);
  process.exit(1);
}
for (const w of form.workers) {
  if (!/^SAMPLE/i.test(w.last) && !/^SAMPLE/i.test(w.first) && !/^SAMPLE/i.test(w.classification)) {
    console.error("FAIL worker is not marked SAMPLE", w);
    process.exit(1);
  }
  if (w.id.length > 4) {
    console.error("FAIL identifying no longer than last4", w.id);
    process.exit(1);
  }
}

const pdf = buildPdf(form);
const out = path.join(__dirname, "..", "test-wh347.pdf");
fs.writeFileSync(out, pdf);
const head = pdf.slice(0, 8).toString("latin1");
if (!head.startsWith("%PDF-")) {
  console.error("FAIL not a PDF", JSON.stringify(head));
  process.exit(1);
}
if (pdf.length < 2000) {
  console.error("FAIL too small", pdf.length);
  process.exit(1);
}
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
  "Boxes on page 2 are not marked"
];
for (const n of need) {
  if (!asText.includes(n)) {
    console.error("FAIL missing text:", n);
    process.exit(1);
  }
}
console.log(
  "OK",
  out,
  "bytes=" + pdf.length,
  "head=" + head,
  "workers=" + form.workers.length,
  "name=" + filenameFor(form)
);
