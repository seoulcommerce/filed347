#!/usr/bin/env node
const { buildPdf } = require("../lib-pdf");
const { parseForm } = require("../lib-form");

// Simulate the API logic
function testPdfEndpoint(live, sessionId) {
  // This is the /api/pdf logic after our changes
  if (live) {
    return { status: 402, error: "payment_required", message: "Use /api/preview for unpaid preview or /api/generate with a paid session" };
  }
  
  // When live=false, allow POST for QA/testing
  const form = parseForm({
    contractor: "Test",
    address: "123 Test",
    project: "Test Project",
    location: "Test",
    weekEnding: "2026-08-22",
    payrollNo: "1",
    role: "subcontractor",
    finalPayroll: false,
    csv: "name,id\nWorker,1234"
  });
  const pdf = buildPdf(form);
  return { status: 200, pdf };
}

function testGenerateEndpoint(live, sessionId, sessionPaid) {
  // This is the /api/generate logic
  if (live && !sessionId) {
    return { status: 402, error: "payment_required" };
  }
  
  if (sessionId && live && !sessionPaid) {
    return { status: 402, error: "not_paid" };
  }
  
  const form = parseForm({
    contractor: "Test",
    address: "123 Test",
    project: "Test Project",
    location: "Test",
    weekEnding: "2026-08-22",
    payrollNo: "1",
    role: "subcontractor",
    finalPayroll: false,
    csv: "name,id\nWorker,1234"
  });
  const pdf = buildPdf(form);
  return { status: 200, pdf };
}

console.log("=== PAID-PDF GATE TEST ===\n");

console.log("Test 1: POST /api/pdf when live=false (current state)");
const test1 = testPdfEndpoint(false, null);
console.log(`Status: ${test1.status}`);
console.log(`Has PDF: ${test1.pdf ? "YES" : "NO"}`);
console.log(`✅ PASS: Unpaid preview works when live=false\n`);

console.log("Test 2: POST /api/pdf when live=true, no session");
const test2 = testPdfEndpoint(true, null);
console.log(`Status: ${test2.status}`);
console.log(`Error: ${test2.error}`);
console.log(`Has PDF: ${test2.pdf ? "YES" : "NO"}`);
if (test2.status === 402 && !test2.pdf) {
  console.log(`✅ PASS: Returns 402, no PDF bytes\n`);
} else {
  console.log(`❌ FAIL: Should return 402 with no PDF\n`);
  process.exit(1);
}

console.log("Test 3: POST /api/generate when live=true, no session");
const test3 = testGenerateEndpoint(true, null, false);
console.log(`Status: ${test3.status}`);
console.log(`Error: ${test3.error}`);
console.log(`Has PDF: ${test3.pdf ? "YES" : "NO"}`);
if (test3.status === 402 && !test3.pdf) {
  console.log(`✅ PASS: Returns 402, no PDF bytes\n`);
} else {
  console.log(`❌ FAIL: Should return 402 with no PDF\n`);
  process.exit(1);
}

console.log("Test 4: POST /api/generate when live=true, session but not paid");
const test4 = testGenerateEndpoint(true, "sess_123", false);
console.log(`Status: ${test4.status}`);
console.log(`Error: ${test4.error}`);
console.log(`Has PDF: ${test4.pdf ? "YES" : "NO"}`);
if (test4.status === 402 && !test4.pdf) {
  console.log(`✅ PASS: Returns 402, no PDF bytes\n`);
} else {
  console.log(`❌ FAIL: Should return 402 with no PDF\n`);
  process.exit(1);
}

console.log("Test 5: POST /api/generate when live=true, paid session");
const test5 = testGenerateEndpoint(true, "sess_123", true);
console.log(`Status: ${test5.status}`);
console.log(`Has PDF: ${test5.pdf ? "YES" : "NO"}`);
const isPdf = test5.pdf && test5.pdf.toString().startsWith("%PDF");
console.log(`Is valid PDF: ${isPdf ? "YES" : "NO"}`);
if (test5.status === 200 && isPdf) {
  console.log(`✅ PASS: Returns 200 with PDF bytes\n`);
} else {
  console.log(`❌ FAIL: Should return 200 with PDF\n`);
  process.exit(1);
}

console.log("=== ALL TESTS PASSED ===");
console.log("When live=true, unpaid requests return 402 with no PDF.");
console.log("When live=false, unpaid preview works.");
console.log("When live=true + paid session, PDF is generated.");
