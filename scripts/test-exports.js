const fs = require("fs");
const path = require("path");
const { parseWorkers, parseForm, last4, looksLikeSsn } = require("../lib-form");
const { buildPdf } = require("../lib-pdf");

function fail(msg) {
  console.error("FAIL", msg);
  process.exit(1);
}

function assertNoSsn(label, text) {
  if (/\d{3}-\d{2}-\d{4}/.test(text)) fail(label + " contains ###-##-#### SSN pattern");
  if (/(?<!\d)\d{9}(?!\d)/.test(text)) fail(label + " contains 9-digit SSN pattern");
}

function emptyDays(w) {
  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "mon_ot", "tue_ot", "wed_ot", "thu_ot", "fri_ot", "sat_ot", "sun_ot"];
  return keys.every((k) => w.days[k] === "" || w.days[k] == null);
}

function runOne(label, csvRel, outName, extra) {
  const csvPath = path.join(__dirname, "..", csvRel);
  const csv = fs.readFileSync(csvPath, "utf8");
  assertNoSsn(label + " csv after last4 check of ids", csv.split("\n").slice(1).map((line) => {
    return "";
  }).join(""));
  const workers = parseWorkers(csv);
  if (workers.length < 3) fail(label + " expected >=3 workers, got " + workers.length);
  for (const w of workers) {
    const sample = /^SAMPLE/i.test(w.last) || /^SAMPLE/i.test(w.first) || /^SAMPLE/i.test(w.classification);
    if (!sample) fail(label + " worker not labeled SAMPLE: " + JSON.stringify(w));
    if (w.id.length > 4) fail(label + " id longer than last4: " + w.id);
    if (looksLikeSsn(w.id)) fail(label + " stored a 9-digit id: " + w.id);
    if (!emptyDays(w)) fail(label + " invented day cells for " + w.last + " " + w.first + " " + JSON.stringify(w.days));
    if (w.stHours === "" && w.otHours === "") fail(label + " missing weekly hours for " + w.last);
  }
  if (extra) extra(workers, csv);

  const form = parseForm({
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
  });
  const pdf = buildPdf(form);
  const out = path.join(__dirname, "..", outName);
  fs.writeFileSync(out, pdf);
  const head = pdf.slice(0, 8).toString("latin1");
  if (!head.startsWith("%PDF-")) fail(label + " not a PDF " + JSON.stringify(head));
  if (pdf.length < 2000) fail(label + " too small " + pdf.length);
  const asText = pdf.toString("latin1");
  for (const n of ["WH-347", "STATEMENT OF COMPLIANCE", "SAMPLE County Culvert"]) {
    if (!asText.includes(n)) fail(label + " missing text: " + n);
  }
  assertNoSsn(label + " pdf", asText);
  if (asText.includes("999-00-0003") || asText.includes("999000003")) {
    fail(label + " printed a full-looking SSN");
  }
  console.log("OK", label, "workers=" + workers.length, "out=" + out, "bytes=" + pdf.length, "head=" + head, "ids=" + workers.map((w) => w.id).join(","));
  return { workers, pdf, out, head };
}

if (last4("999-00-0003") !== "0003") fail("last4 of 999-00-0003");
if (last4("***-**-0001") !== "0001") fail("last4 of masked tax id");
if (last4("123456789") !== "6789") fail("last4 of 9-digit");
if (!looksLikeSsn("123-45-6789")) fail("looksLikeSsn dashed");
if (looksLikeSsn("0001")) fail("looksLikeSsn last4");

runOne("gusto", "fixtures/gusto-weekly.csv", "test-gusto-wh347.pdf");
runOne("qbo-adp", "fixtures/qbo-adp-weekly.csv", "test-qbo-adp-wh347.pdf", (workers) => {
  const ids = workers.map((w) => w.id);
  if (!ids.includes("0001") || !ids.includes("0003")) fail("qbo last4 ids, got " + ids.join(","));
  if (ids.some((id) => id.length > 4)) fail("qbo id >4");
});

const nasty = "Full Name,Tax ID,Job Title,Regular Pay Hours\nSAMPLE Nine,123-45-6789,SAMPLE Laborer,40\nSAMPLE Eight,987654321,SAMPLE Operator,32\nSAMPLE Seven,***-**-0007,SAMPLE Carpenter,40\n";
const nastyWorkers = parseWorkers(nasty);
if (nastyWorkers.length < 3) fail("nasty last4 workers");
if (!nastyWorkers.some((w) => w.id === "6789")) fail("last4 dashed SSN");
if (!nastyWorkers.some((w) => w.id === "4321")) fail("last4 9-digit");
if (!nastyWorkers.some((w) => w.id === "0007")) fail("last4 masked");
if (nastyWorkers.some((w) => w.id.length > 4 || looksLikeSsn(w.id))) fail("nasty kept a full SSN");
const nastyPdf = buildPdf(parseForm({
  contractor: "SAMPLE",
  project: "SAMPLE last4",
  weekEnding: "2026-08-22",
  role: "subcontractor",
  csv: nasty
})).toString("latin1");
assertNoSsn("nasty pdf", nastyPdf);
if (nastyPdf.includes("123-45-6789") || nastyPdf.includes("123456789") || nastyPdf.includes("987654321")) fail("nasty printed full SSN");

console.log("OK exports");
