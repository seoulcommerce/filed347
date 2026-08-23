const { ascii, parseForm } = require("./lib-form");

function pdfEscape(s) {
  return ascii(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

const HW = {
  " ": 278, "!": 278, '"': 355, "#": 556, "$": 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, "[": 278,
  "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556, b: 556, c: 500,
  d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222,
  m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556,
  v: 500, w: 722, x: 500, y: 500, z: 500, "{": 334, "|": 260, "}": 334, "~": 584
};

function textWidth(s, size) {
  let w = 0;
  const t = ascii(s);
  for (let i = 0; i < t.length; i++) w += HW[t[i]] || 500;
  return (w * size) / 1000;
}

function clip(s, size, max) {
  const t = ascii(s);
  if (textWidth(t, size) <= max) return t;
  let out = t;
  while (out.length && textWidth(out + "...", size) > max) out = out.slice(0, -1);
  return out + "...";
}

function wrap(s, size, max) {
  const words = ascii(s).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (textWidth(next, size) <= max) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function T(ops, s, size, x, y, bold) {
  ops.push("BT /" + (bold ? "F2" : "F1") + " " + size + " Tf " + x.toFixed(2) + " " + y.toFixed(2) + " Td (" + pdfEscape(s) + ") Tj ET");
}

function L(ops, x1, y1, x2, y2, w) {
  ops.push((w || 0.4) + " w " + x1.toFixed(2) + " " + y1.toFixed(2) + " m " + x2.toFixed(2) + " " + y2.toFixed(2) + " l S");
}

function R(ops, x, y, w, h, sw) {
  ops.push((sw || 0.5) + " w " + x.toFixed(2) + " " + y.toFixed(2) + " " + w.toFixed(2) + " " + h.toFixed(2) + " re S");
}

function checkbox(ops, x, y, checked) {
  R(ops, x, y, 8, 8, 0.7);
  if (checked) {
    ops.push("0.9 w " + (x + 1).toFixed(2) + " " + (y + 1).toFixed(2) + " m " + (x + 7).toFixed(2) + " " + (y + 7).toFixed(2) + " l S");
    ops.push("0.9 w " + (x + 7).toFixed(2) + " " + (y + 1).toFixed(2) + " m " + (x + 1).toFixed(2) + " " + (y + 7).toFixed(2) + " l S");
  }
}

const FOOTER = "Filed347 generated this from your CSV. Not a legal opinion. You must review and sign. Software, no human queue.";

const CERTS = [
  "The payroll information submitted with this statement is correct and complete for the above project during the above period, and the wage and fringe benefit rates paid to the workers, including credit taken for the reasonably anticipated costs of a bona fide fringe benefit plan, fund or program, are not less than the applicable wage and fringe benefits rates for the classification(s) of work actually performed, as specified in the wage determination(s) incorporated into the contract.",
  "All regular payrolls and all other basic records that the contractor is required to maintain for this payroll period are complete and accurate and will be made available upon request from the agency or the Department of Labor.",
  "The classifications reported for each laborer or mechanic are the classification(s) of work that each worker actually performed.",
  "Any workers paid as apprentices during the above period are duly registered in a bona fide apprenticeship program registered with the Office of Apprenticeship, Employment and Training Administration, United States Department of Labor (\"OA\"), or a State Apprenticeship Agency (\"SAA\") recognized by Department of Labor.",
  "Fringe benefits have been paid in cash and/or to bona fide fringe benefit plans, funds, or programs (if applicable).",
  "All workers on the project have been paid the full weekly wages earned, and no rebates or deductions have been or will be made either directly or indirectly, other than permissible deductions as defined in 29 CFR part 3."
];

function footer(ops, w) {
  T(ops, FOOTER, 7, 18, 14, false);
  T(ops, "WH-347 wording from dol.gov/agencies/whd/forms/wh347-web  ·  Instructions: dol.gov/agencies/whd/forms/wh347", 6.5, 18, 6, false);
}

function dash(v) {
  return v === "" || v == null ? "" : String(v);
}

function buildPayrollPage(form, workers, startIndex, pageNo, pageCount) {
  const W = 792;
  const H = 612;
  const ops = [];
  const left = 16;
  let y = 592;

  T(ops, "U.S. Department of Labor   Wage and Hour Division", 8, left, y, false);
  T(ops, "Form WH-347", 9, 710, y, true);
  y -= 16;
  T(ops, "PAYROLL", 16, left, y, true);
  T(ops, "(For Contractor's Optional Use; See Instructions at dol.gov/agencies/whd/forms/wh347)", 7, 92, y + 2, false);
  T(ops, "Page " + pageNo + " of " + pageCount, 8, 720, y + 2, false);
  y -= 14;
  T(ops, "Rev. 2024 web wording. Boxes on page 2 are not marked. You review and sign.", 7, left, y, false);
  y -= 16;

  const boxH = 54;
  R(ops, left, y - boxH, 760, boxH, 0.7);
  T(ops, "Prime contractor / Subcontractor:", 7, left + 4, y - 11, false);
  checkbox(ops, left + 140, y - 18, form.role === "prime");
  T(ops, "Prime", 7, left + 152, y - 11, false);
  checkbox(ops, left + 210, y - 18, form.role === "subcontractor");
  T(ops, "Subcontractor", 7, left + 222, y - 11, false);
  T(ops, "Final payroll this project?", 7, 430, y - 11, false);
  checkbox(ops, 580, y - 18, form.finalPayroll);
  T(ops, "Yes", 7, 592, y - 11, false);
  T(ops, "Name: " + clip(form.contractor || "", 8, 240), 8, left + 4, y - 24, false);
  T(ops, "Address: " + clip(form.address || "", 8, 300), 8, 300, y - 24, false);
  T(ops, "Project: " + clip(form.project || "", 8, 250), 8, left + 4, y - 36, false);
  T(ops, "Project / contract no.: " + clip(form.contractNo || "", 8, 140), 8, 300, y - 36, false);
  T(ops, "Payroll no.: " + clip(form.payrollNo || "", 8, 60), 8, 560, y - 36, false);
  T(ops, "Location: " + clip(form.location || "", 8, 250), 8, left + 4, y - 48, false);
  T(ops, "Week ending: " + clip(form.weekEnding || "", 8, 100), 8, 300, y - 48, false);
  T(ops, "Wage determination (as pasted, not invented): " + clip(form.wageDetermination || "", 7, 220), 7, 460, y - 48, false);
  y -= boxH + 8;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const cols = [];
  let x = left;
  function col(key, width, label) {
    cols.push({ key, x, w: width, label });
    x += width;
  }
  col("name", 78, "1. Worker last / first");
  col("id", 30, "ID last4");
  col("jr", 22, "J/RA");
  col("class", 72, "Labor classification");
  const dayW = 28;
  const day0 = x;
  days.forEach((d) => {
    col("d_" + d, dayW, d);
  });
  col("tot", 32, "Total hrs");
  col("rate", 34, "Hourly ST/OT");
  col("fringe", 34, "Fringe credit");
  col("cash", 34, "Cash in lieu");
  col("gross", 38, "Gross this project");
  col("gall", 38, "Gross all work");
  col("ded", 78, "Deductions tax/FICA/other/tot");
  col("net", 36, "Net");

  const tableW = x - left;
  const headH = 28;
  const rowH = 22;
  const tableH = headH + workers.length * rowH;
  R(ops, left, y - tableH, tableW, tableH, 0.7);
  T(ops, "Hours each day  ST (top) / OT (bottom)", 6.5, day0, y + 2, false);

  cols.forEach((c) => {
    L(ops, c.x, y, c.x, y - tableH, 0.3);
    const lines = wrap(c.label, 6, c.w - 3);
    lines.slice(0, 3).forEach((ln, i) => T(ops, ln, 6, c.x + 1.5, y - 8 - i * 7, true));
  });
  L(ops, left, y - headH, left + tableW, y - headH, 0.5);

  workers.forEach((w, i) => {
    const top = y - headH - i * rowH;
    const mid = top - 9;
    const bot = top - 18;
    L(ops, left, top - rowH, left + tableW, top - rowH, 0.25);
    T(ops, clip((w.last || "") + (w.last && w.first ? ", " : "") + (w.first || ""), 7, 76), 7, cols[0].x + 1.5, mid, false);
    T(ops, w.id || "", 7, cols[1].x + 1.5, mid, false);
    T(ops, w.jr || "", 7, cols[2].x + 2, mid, false);
    T(ops, clip(w.classification || "", 6.5, 70), 6.5, cols[3].x + 1.5, mid, false);
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    dayKeys.forEach((dk, di) => {
      const cx = day0 + di * dayW + 2;
      T(ops, dash(w.days[dk]), 6.5, cx, mid + 1, false);
      T(ops, dash(w.days[dk + "_ot"]), 6.5, cx, bot + 1, false);
    });
    T(ops, "ST " + dash(w.stHours), 6, cols.find((c) => c.key === "tot").x + 1, mid + 1, false);
    T(ops, "OT " + dash(w.otHours), 6, cols.find((c) => c.key === "tot").x + 1, bot + 1, false);
    T(ops, dash(w.stRate), 6.5, cols.find((c) => c.key === "rate").x + 1, mid + 1, false);
    T(ops, dash(w.otRate), 6.5, cols.find((c) => c.key === "rate").x + 1, bot + 1, false);
    T(ops, dash(w.fringe), 6.5, cols.find((c) => c.key === "fringe").x + 2, mid, false);
    T(ops, dash(w.cashLieu), 6.5, cols.find((c) => c.key === "cash").x + 2, mid, false);
    T(ops, dash(w.gross), 6.5, cols.find((c) => c.key === "gross").x + 2, mid, false);
    T(ops, dash(w.grossAll), 6.5, cols.find((c) => c.key === "gall").x + 2, mid, false);
    const ded = cols.find((c) => c.key === "ded");
    T(ops, "T " + dash(w.tax) + "  F " + dash(w.fica), 6, ded.x + 1, mid + 1, false);
    T(ops, "O " + dash(w.other) + "  = " + dash(w.totalDed), 6, ded.x + 1, bot + 1, false);
    T(ops, dash(w.net), 6.5, cols.find((c) => c.key === "net").x + 1, mid, false);
    T(ops, String(startIndex + i + 1), 6, left - 10, mid, false);
  });

  T(ops, "Col. 1E identifying no. is last 4 only. Full SSN is never printed. Hours and rates are from your CSV. We do not invent a wage determination.", 6.5, left, y - tableH - 10, false);
  footer(ops, W);
  return { w: W, h: H, ops };
}

function buildStatementPage(form, pageNo, pageCount) {
  const W = 612;
  const H = 792;
  const ops = [];
  const left = 36;
  const max = 540;
  let y = 760;

  T(ops, "U.S. Department of Labor   Wage and Hour Division", 8, left, y, false);
  T(ops, "Form WH-347", 9, 500, y, true);
  y -= 16;
  T(ops, "STATEMENT OF COMPLIANCE", 14, left, y, true);
  T(ops, "Page " + pageNo + " of " + pageCount, 8, 500, y, false);
  y -= 12;
  T(ops, "Date (blank - you date when you sign): ____________________", 8, left, y, false);
  y -= 14;
  T(ops, "I, " + clip(form.officialName || "________________________________", 9, 260) + ", " + clip(form.officialTitle || "____________________", 9, 180), 9, left, y, false);
  y -= 12;
  const intro = "I paid or supervised the payment of the laborers or mechanics working on the above project during the stated time period. I certify the following:";
  wrap(intro, 8.5, max).forEach((ln) => {
    T(ops, ln, 8.5, left, y, false);
    y -= 11;
  });
  y -= 4;

  T(ops, "Certification boxes (printed as text; not marked as if Filed347 certified):", 8, left, y, true);
  y -= 14;

  CERTS.forEach((c, i) => {
    checkbox(ops, left, y - 1);
    T(ops, "(" + (i + 1) + ")", 8, left + 12, y, true);
    const lines = wrap(c, 7.5, max - 36);
    lines.forEach((ln, li) => {
      T(ops, ln, 7.5, left + 32, y - li * 9.5, false);
    });
    y -= lines.length * 9.5 + 8;
  });

  y -= 4;
  T(ops, "Project: " + clip(form.project || "", 8, 240), 8, left, y, false);
  T(ops, "Project / contract no.: " + clip(form.contractNo || "", 8, 140), 8, 320, y, false);
  y -= 12;
  T(ops, "Payroll no.: " + clip(form.payrollNo || "", 8, 50), 8, left, y, false);
  T(ops, "Week ending: " + clip(form.weekEnding || "", 8, 90), 8, 160, y, false);
  T(ops, "Location: " + clip(form.location || "", 8, 200), 8, 320, y, false);
  y -= 12;
  T(ops, "Contractor / sub: " + clip(form.contractor || "", 8, 240), 8, left, y, false);
  T(ops, "Address: " + clip(form.address || "", 8, 220), 8, 320, y, false);
  y -= 16;

  T(ops, "Wage determination (printed as you pasted; we do not invent WD numbers):", 8, left, y, true);
  y -= 12;
  const wd = form.wageDetermination || "";
  R(ops, left, y - 34, max, 40, 0.5);
  wrap(wd || "(none pasted)", 8, max - 8).slice(0, 3).forEach((ln, i) => {
    T(ops, ln, 8, left + 4, y - 10 - i * 10, false);
  });
  y -= 50;

  T(ops, "Additional remarks (from you; blank if none):", 8, left, y, true);
  y -= 12;
  R(ops, left, y - 28, max, 34, 0.5);
  wrap(form.remarks || "", 8, max - 8).slice(0, 2).forEach((ln, i) => {
    T(ops, ln, 8, left + 4, y - 10 - i * 10, false);
  });
  y -= 44;

  T(ops, "Signature of certifying official (leave blank until you sign):", 8, left, y, true);
  y -= 18;
  L(ops, left, y, left + 260, y, 0.7);
  T(ops, "Date: ____________________", 8, 360, y + 2, false);
  y -= 14;
  T(ops, "Name (printed): " + clip(form.officialName || "", 8, 200), 8, left, y, false);
  T(ops, "Title: " + clip(form.officialTitle || "", 8, 160), 8, 320, y, false);
  y -= 12;
  T(ops, "Telephone: " + clip(form.officialPhone || "", 8, 140), 8, left, y, false);
  T(ops, "Email: " + clip(form.officialEmail || "", 8, 200), 8, 320, y, false);
  y -= 16;
  T(ops, "The Statement of Compliance need not be notarized. It is subject to the penalties provided by 18 U.S.C. 1001,", 7.5, left, y, false);
  y -= 10;
  T(ops, "namely a fine, possible imprisonment of not more than 5 years, or both. Sign only if you have knowledge of the facts.", 7.5, left, y, false);
  y -= 12;
  T(ops, "Filed347 does not say you are compliant. This is the form built from your CSV. You review, mark the boxes that apply, and sign.", 7.5, left, y, false);

  footer(ops, W);
  return { w: W, h: H, ops };
}

function assemble(pages) {
  const bodies = [];
  const pageNums = [];
  let n = 5;
  for (let i = 0; i < pages.length; i++) {
    pageNums.push(n);
    n += 2;
  }
  bodies[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  bodies[2] = "<< /Type /Pages /Kids [" + pageNums.map((p) => p + " 0 R").join(" ") + "] /Count " + pages.length + " >>";
  bodies[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  bodies[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  n = 5;
  for (const p of pages) {
    const stream = p.ops.join("\n") + "\n";
    const pageN = n++;
    const contentN = n++;
    bodies[pageN] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + p.w + " " + p.h + "] /Contents " + contentN + " 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>";
    bodies[contentN] = "<< /Length " + Buffer.byteLength(stream, "latin1") + " >>\nstream\n" + stream + "endstream";
  }
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i < bodies.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += i + " 0 obj\n" + bodies[i] + "\nendobj\n";
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += "xref\n0 " + bodies.length + "\n0000000000 65535 f \n";
  for (let i = 1; i < bodies.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += "trailer << /Size " + bodies.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(pdf, "latin1");
}

function buildPdf(input, options) {
  const form = input && input.workers ? input : parseForm(input || {});
  const workers = form.workers || [];
  const per = 8;
  const chunks = [];
  if (!workers.length) chunks.push([]);
  for (let i = 0; i < workers.length; i += per) chunks.push(workers.slice(i, i + per));
  const pageCount = chunks.length + 1;
  const pages = [];
  chunks.forEach((chunk, i) => {
    pages.push(buildPayrollPage(form, chunk, i * per, i + 1, pageCount));
  });
  pages.push(buildStatementPage(form, pageCount, pageCount));
  
  if (options && options.watermark) {
    pages.forEach(p => {
      p.ops.unshift("q 0.85 0.85 0.85 rg");
      p.ops.unshift("BT /F2 42 Tf " + (p.w / 2 - 110).toFixed(2) + " " + (p.h / 2).toFixed(2) + " Td (PREVIEW) Tj ET");
      p.ops.unshift("Q");
    });
  }
  
  return assemble(pages);
}

module.exports = { buildPdf, FOOTER, CERTS };
