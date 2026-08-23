function clean(s, n) {
  return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").trim().slice(0, n || 200);
}

function ascii(s) {
  return clean(s, 400)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

function last4(s) {
  const d = String(s == null ? "" : s).replace(/[^0-9A-Za-z]/g, "");
  if (!d) return "";
  return d.slice(-4);
}

function num(s) {
  const t = String(s == null ? "" : s).replace(/[$,]/g, "").trim();
  if (!t) return "";
  const n = Number(t);
  if (!Number.isFinite(n)) return "";
  return String(n);
}

function money(s) {
  const t = num(s);
  if (t === "") return "";
  const n = Number(t);
  return (Math.round(n * 100) / 100).toFixed(2);
}

function hours(s) {
  const t = num(s);
  if (t === "") return "";
  const n = Number(t);
  return String(Math.round(n * 100) / 100);
}

function jr(s) {
  const t = String(s == null ? "" : s).trim().toLowerCase();
  if (!t) return "";
  if (/^(j|journey|journeyman|journeyworker|jw)$/.test(t)) return "J";
  if (/^(ra|a|apprentice|registered|registered apprentice)$/.test(t)) return "RA";
  if (t === "j") return "J";
  if (t === "ra") return "RA";
  const u = t.toUpperCase();
  if (u === "J" || u === "RA") return u;
  return "";
}

function parseCsv(text) {
  const src = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let i = 0;
  let quoted = false;
  while (i < src.length) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function normHeader(h) {
  return String(h || "")
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const ALIAS = {
  employee: "name",
  name: "name",
  worker: "name",
  worker_name: "name",
  employee_name: "name",
  last_name: "last_name",
  lastname: "last_name",
  last: "last_name",
  worker_last_name: "last_name",
  first_name: "first_name",
  firstname: "first_name",
  first: "first_name",
  worker_first_name: "first_name",
  classification: "classification",
  job: "classification",
  title: "classification",
  class: "classification",
  labor_classification: "classification",
  job_title: "classification",
  id: "id",
  ssn_last4: "id",
  ssn: "id",
  identifying: "id",
  identifying_no: "id",
  worker_identifying_no: "id",
  employee_id: "id",
  journey: "jr",
  apprentice: "jr",
  j_ra: "jr",
  jra: "jr",
  journeyworker: "jr",
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
  mon_ot: "mon_ot",
  tue_ot: "tue_ot",
  wed_ot: "wed_ot",
  thu_ot: "thu_ot",
  fri_ot: "fri_ot",
  sat_ot: "sat_ot",
  sun_ot: "sun_ot",
  st_hours: "st_hours",
  regular_hours: "st_hours",
  regular: "st_hours",
  ot_hours: "ot_hours",
  overtime_hours: "ot_hours",
  overtime: "ot_hours",
  st_rate: "st_rate",
  regular_rate: "st_rate",
  rate: "st_rate",
  hourly_rate: "st_rate",
  ot_rate: "ot_rate",
  overtime_rate: "ot_rate",
  fringe: "fringe",
  fringe_credit: "fringe",
  fringe_benefit: "fringe",
  fringe_benefits: "fringe",
  cash_lieu: "cash_lieu",
  cash_in_lieu: "cash_lieu",
  payment_in_lieu: "cash_lieu",
  gross: "gross",
  gross_this_project: "gross",
  gross_project: "gross",
  gross_all: "gross_all",
  gross_all_work: "gross_all",
  fica: "fica",
  federal: "tax",
  tax: "tax",
  taxes: "tax",
  federal_tax: "tax",
  tax_withholdings: "tax",
  other: "other",
  other_deductions: "other",
  total_deductions: "total_deductions",
  deductions: "total_deductions",
  net: "net",
  net_pay: "net",
  net_payment: "net"
};

function mapHeaders(headerRow) {
  const map = {};
  headerRow.forEach((h, i) => {
    const key = ALIAS[normHeader(h)];
    if (key && map[key] === undefined) map[key] = i;
  });
  return map;
}

function cell(row, map, key) {
  const i = map[key];
  if (i === undefined) return "";
  return row[i] == null ? "" : String(row[i]);
}

function splitName(full) {
  const t = clean(full, 120);
  if (!t) return { last: "", first: "" };
  if (t.includes(",")) {
    const [last, rest] = t.split(",", 2);
    return { last: clean(last, 40), first: clean(rest, 40) };
  }
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { last: parts[0], first: "" };
  return { last: parts[parts.length - 1], first: parts.slice(0, -1).join(" ") };
}

function add(a, b) {
  const x = a === "" ? 0 : Number(a);
  const y = b === "" ? 0 : Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return a || b || "";
  const s = Math.round((x + y) * 100) / 100;
  return String(s);
}

function parseWorkers(csvText) {
  const rows = parseCsv(csvText);
  if (!rows.length) return [];
  const map = mapHeaders(rows[0]);
  const workers = [];
  for (let r = 1; r < rows.length && workers.length < 200; r++) {
    const row = rows[r];
    let last = clean(cell(row, map, "last_name"), 40);
    let first = clean(cell(row, map, "first_name"), 40);
    if (!last && !first) {
      const split = splitName(cell(row, map, "name"));
      last = split.last;
      first = split.first;
    }
    if (!last && !first && !clean(cell(row, map, "classification"), 40)) continue;
    const days = {
      mon: hours(cell(row, map, "mon")),
      tue: hours(cell(row, map, "tue")),
      wed: hours(cell(row, map, "wed")),
      thu: hours(cell(row, map, "thu")),
      fri: hours(cell(row, map, "fri")),
      sat: hours(cell(row, map, "sat")),
      sun: hours(cell(row, map, "sun")),
      mon_ot: hours(cell(row, map, "mon_ot")),
      tue_ot: hours(cell(row, map, "tue_ot")),
      wed_ot: hours(cell(row, map, "wed_ot")),
      thu_ot: hours(cell(row, map, "thu_ot")),
      fri_ot: hours(cell(row, map, "fri_ot")),
      sat_ot: hours(cell(row, map, "sat_ot")),
      sun_ot: hours(cell(row, map, "sun_ot"))
    };
    let stHours = hours(cell(row, map, "st_hours"));
    let otHours = hours(cell(row, map, "ot_hours"));
    const daySt = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].reduce((s, d) => add(s, days[d]), "");
    const dayOt = ["mon_ot", "tue_ot", "wed_ot", "thu_ot", "fri_ot", "sat_ot", "sun_ot"].reduce((s, d) => add(s, days[d]), "");
    if (stHours === "" && daySt !== "") stHours = daySt;
    if (otHours === "" && dayOt !== "") otHours = dayOt;
    const tax = money(cell(row, map, "tax"));
    const fica = money(cell(row, map, "fica"));
    const other = money(cell(row, map, "other"));
    let totalDed = money(cell(row, map, "total_deductions"));
    if (totalDed === "" && (tax || fica || other)) totalDed = money(add(add(tax, fica), other));
    workers.push({
      last: ascii(last).slice(0, 40),
      first: ascii(first).slice(0, 40),
      id: last4(cell(row, map, "id")),
      jr: jr(cell(row, map, "jr")),
      classification: ascii(cell(row, map, "classification")).slice(0, 48),
      days,
      stHours,
      otHours,
      totalHours: add(stHours, otHours),
      stRate: money(cell(row, map, "st_rate")),
      otRate: money(cell(row, map, "ot_rate")),
      fringe: money(cell(row, map, "fringe")),
      cashLieu: money(cell(row, map, "cash_lieu")),
      gross: money(cell(row, map, "gross")),
      grossAll: money(cell(row, map, "gross_all")),
      tax,
      fica,
      other,
      totalDed,
      net: money(cell(row, map, "net"))
    });
  }
  return workers;
}

function parseForm(body) {
  const b = body || {};
  return {
    email: clean(b.email, 200),
    contractor: ascii(b.contractor).slice(0, 120),
    address: ascii(b.address).slice(0, 200),
    project: ascii(b.project).slice(0, 160),
    contractNo: ascii(b.contractNo || b.contract_no).slice(0, 80),
    location: ascii(b.location).slice(0, 160),
    weekEnding: ascii(b.weekEnding || b.week_ending).slice(0, 40),
    payrollNo: ascii(b.payrollNo || b.payroll_no).slice(0, 20),
    wageDetermination: ascii(b.wageDetermination || b.wage_determination).slice(0, 500),
    officialName: ascii(b.officialName || b.official_name).slice(0, 80),
    officialTitle: ascii(b.officialTitle || b.official_title).slice(0, 80),
    officialPhone: ascii(b.officialPhone || b.official_phone).slice(0, 40),
    officialEmail: clean(b.officialEmail || b.official_email, 200),
    remarks: ascii(b.remarks).slice(0, 400),
    role: String(b.role || "").toLowerCase() === "prime" ? "prime" : "subcontractor",
    finalPayroll: !!(b.finalPayroll || b.final_payroll),
    csv: String(b.csv == null ? "" : b.csv),
    workers: parseWorkers(b.csv)
  };
}

function filenameFor(form) {
  const bit = [form.project, form.weekEnding, form.payrollNo].filter(Boolean).join("-") || "payroll";
  return "filed347-wh347-" + bit.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 60) + ".pdf";
}

module.exports = {
  clean, ascii, last4, num, money, hours, jr,
  parseCsv, parseWorkers, parseForm, filenameFor
};
