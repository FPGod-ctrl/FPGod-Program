# 2026 Fact Find: sections, keys and content

The form is the 2026 XPLAN/Opex fact find. Sections are found by their exact Heading 1 / Heading 2 text. Order below follows the builder's section list; the master's own order wins if it differs.

Per-client tables are `[label, client 1, client 2]` (couple) or `[label, client 1]` (single).

| Heading 1 (Heading 2) | Data key | Kind | What to write |
|---|---|---|---|
| Cover table: `Client Name(s)`, `Date Completed` | `full_names`, `date_completed` | Cover | Full names joined with ` & `. Date as `22 October 2026`. |
| Why are you seeking advice | `why` | Text box | Second person. The client's motivation only. No product, no "top up", no "cancel". |
| Your financial goals | `goals` | Table `[for, description, timeframe, amount, priority]` | One broad goal per client. Timeframe Short / Medium / Long Term; priority High / Medium / Low; amount per month for IP, lump sum otherwise, `TBC` if not set (default, Q-FF-15). No insurer, product or exclusion acknowledgement. |
| Your planning preferences | `planning_preferences` | Text box | Only what was said. |
| Future changes | `future_changes` | Text box | Expected changes the client mentioned (job, children, property). |
| Your story | `story` | Text box | Second person. Short narrative of the client's situation. |
| Your personal information | `personal` | Per-client table | See suggested labels. |
| Your contact details | `contact` | Per-client table | Address in two lines, capitals. |
| Your dependants | `dependants` | Table `[name, relationship, age, living at home, dependent]` | Each child or dependant. |
| Your employment | `employment` | Per-client table | Occupation, employer, basis, income. |
| Your health | `health` | Per-client table | Status `Good` unless a condition was disclosed (default, Q-FF-5). |
| Your cashflow (Your income) | `income` | Table `[description, owner, amount]` | Total added by the builder. Annual, gross; one total for all owners (default, Q-FF-4). |
| Your cashflow (Your expenses) | `expenses` | Table `[description, owner, amount]` | Same: annual, one total (default, Q-FF-4). |
| Your cashflow (Other cashflow details) | `other_cashflow` | Per-client table | Only what was said. |
| Your assets | `assets` | Table `[description, owner, amount]` | Total added. |
| Your liabilities | `liabilities` | Table `[description, owner, amount]` | Total added. Amounts positive. |
| Your retirement products | `super` | Table `[plan, policy #, owner, balance, life, tpd, ip, beneficiaries]` | `TBC` for unknown policy numbers or beneficiaries. |
| Your personal insurance | `insurance` | Table `[description, owner, life insured, type, cover, premium]` | Existing cover only. Never proposed cover. |
| Your estate planning | `estate` | Per-client table | Will, Power of Attorney, as said. |
| Any section: checkbox row | `not_applicable` / `not_disclosed` (lists of section keys) | Checkbox | Not applicable = client confirmed it does not apply; Not disclosed = not discussed (default, Q-FF-11). |
| Any section: Any changes | `changes[key]` | Text box | Review clients: what changed, or `No change`. |
| Any section: Additional information | `additional[key]` | Text box | Anything that does not fit a row. |
| About our advice (Scope of advice) | `scope` (defaults to `why`) | Text box | From the meeting at Stage 2; the SOA wording word for word once the SOA exists (default, Q-FF-3). |
| About our advice (Agreed scope of advice) | `scope_items` | Text box | Advice areas, not outcomes. Fixed lead-in and the fixed first bullet added (default, Q-FF-2). |
| About our advice (Incomplete or inaccurate information) | `incomplete_info` | Text box | Default `None` (default, Q-FF-6). |
| About our advice (Adviser expertise) | `expertise` | Text box | Default `Yes` (default, Q-FF-6). |
| About our advice (Advice limitations) | — | Text box | Master's wording, unchanged (default, Q-FF-17). |
| Signatories | `full_names` | Table | Client names. Adviser signatory: Tristan Biro, corrected by hand if the master names another adviser (default, Q-FF-1). |

## Row labels for per-client tables

Use these labels, and include a row only when it holds something: XPLAN prints only rows that hold data (default, Q-FF-10).

| Table | Suggested labels |
|---|---|
| `personal` | Title; Preferred name; Date of birth; Gender; Marital status; Smoker; Residency status |
| `contact` | Home address; Postal address; Mobile; Email |
| `employment` | Occupation; Employer; Employment basis; Hours per week; Time in role; Gross annual income |
| `health` | Health status; Height; Weight; Conditions; Medication |
| `estate` | Will in place; Will last reviewed; Power of Attorney; Executor |
| `other_cashflow` | As said in the meeting |

## Example rows (fictional)

```
personal:  ["Date of birth", "5 June 1982 (44)", "TBC"]
contact:   ["Home address", "12 EXAMPLE STREET\nEXAMPLEVILLE VIC 3000", "Same as [CLIENT_1]"]
income:    ["Salary – PAYG", "[CLIENT_1]", "$120,000"]
goals:     ["[CLIENT_1]", "Review your personal insurance and implement a cost effective strategy that protects your family's lifestyle.", "Short Term", "TBC", "High"]
```
