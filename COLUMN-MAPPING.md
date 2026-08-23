# Filed347 column mapping

CSV headers are normalized (lowercase, non-letters become `_`) and then aliased onto WH-347 fields. Unknown columns are ignored. Day columns are used only when present. Weekly ST/OT totals do **not** invent Mon–Fri hours.

Identifying numbers are last-4 only. If a cell looks like a 9-digit SSN (`123-45-6789` or nine digits), we store the last four and never print the rest.

## Gusto Payroll Journal / weekly export → WH-347

| Gusto header | WH-347 field |
| --- | --- |
| Employee last name | Worker last name (col. 1) |
| Employee first name | Worker first name (col. 1) |
| Job title | Labor classification |
| Employee ID | Identifying no. (last 4 only) |
| Regular hours | ST hours (weekly total). Day cells stay empty. |
| Overtime hours | OT hours (weekly total). Day cells stay empty. |
| Gross earnings | Gross this project |
| Federal income tax | Deduction: tax |
| Social Security tax | Deduction: FICA (SS) |
| Employee deductions | Deduction: other |
| Net pay | Net |

Gusto weekly journals typically have no Mon–Sun columns and no hourly rate columns. Those WH-347 cells stay blank. You fill leftover boxes on the PDF.

## QBO / ADP-ish weekly export → WH-347

| QBO / ADP-ish header | WH-347 field |
| --- | --- |
| Full Name | Worker last / first (split on comma or last token) |
| Job Title | Labor classification |
| Tax ID | Identifying no. (last 4 only; `***-**-0001` or `123-45-6789` → `0001` / `6789`) |
| Regular Pay Hours | ST hours (weekly total). Day cells stay empty. |
| Overtime Hours | OT hours (weekly total). Day cells stay empty. |
| Regular Rate | Hourly ST rate |
| Overtime Rate | Hourly OT rate |
| Gross Pay | Gross this project |
| Federal Income Tax | Deduction: tax |
| Social Security | Deduction: FICA (SS) |
| Medicare | Added into FICA (SS + Medicare) |
| Other Deductions | Deduction: other |
| Net Pay | Net |

## Also accepted (custom / sample.csv)

`last_name`, `first_name`, `employee` / `name`, `classification`, `id` / `ssn_last4`, `journey` (J/RA), `mon`…`sun` and `mon_ot`…`sun_ot`, `st_hours`, `ot_hours`, `st_rate`, `ot_rate`, `fringe`, `cash_lieu`, `gross`, `gross_all`, `fica`, `federal`, `other`, `total_deductions`, `net`.

## What we do not do

- We do not invent Mon–Fri 8s from a weekly total.
- We do not invent a wage determination.
- We do not mark the six Statement of Compliance certification boxes.
- We do not print a full SSN.
