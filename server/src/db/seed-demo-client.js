import { pool, withTransaction } from '../config/db.js';
import { storage } from '../services/storage.js';

/**
 * Seeds ONE fully-populated demo client — "John & Mary Test" — so every screen
 * in the app can be shown with realistic data (a walkthrough / sales demo file).
 *
 * Unlike db/seed.js this does NOT truncate anything: it removes only its own
 * demo rows and re-inserts them, so it is safe to re-run against a live database
 * alongside real client files.
 *
 * Run with:  npm run db:seed:demo
 */

const GROUP_NAME = 'The Test Household (Demo)';

// Superannuation and share holdings live in current_investments (the UI folds
// those into the asset total), so they are deliberately absent from `assets`
// below — listing them in both places would double-count net worth.

// ---------------------------------------------------------------- documents
// Written to the storage driver so Download / Scan & Fill work in the demo.
const DEMO_DOCS = [
  {
    original_name: 'Test - Fact Find (Jul 2026).txt',
    doc_type: 'client_profile',
    scan_status: 'done',
    body: `CLIENT FACT FIND — TEST HOUSEHOLD
Prepared: 8 July 2026 | Adviser: Tristan Biro, Lakeside Financial

PERSONAL
Client 1: John Michael Test, DOB 14/03/1978, married, non-smoker
  Civil Engineering Manager, Harbourline Infrastructure Pty Ltd (full time)
  Gross salary $185,000 p.a. | Mobile 0412 555 018 | john.test@example.com
Client 2: Mary Louise Test, DOB 02/11/1980, married, non-smoker
  Clinical Nurse Specialist, Northern Districts Health (part time, 0.8 FTE)
  Gross salary $96,000 p.a. | Mobile 0413 555 902 | mary.test@example.com
Address: 24 Marlowe Crescent, Epping NSW 2121

DEPENDANTS
  Ella Test (b. 18/06/2010) — Year 10, Marsden High School
  Harry Test (b. 27/02/2013) — Year 7, Marsden High School
  Patricia Doyle (Mary's mother, b. 09/09/1953) — independent, lives locally

SUPERANNUATION
  John  — Australian Retirement Trust, High Growth, $412,500 (SG only)
  Mary  — HESTA, Balanced Growth, $268,400 (SG only)
  John  — Colonial First State FirstChoice (legacy), $23,800, fee 1.92% p.a.

PROPERTY & DEBT
  Family home, Epping NSW — $1,480,000 | CBA loan $486,000 @ 6.14% P&I
  Investment unit, Newcastle NSW — $610,000 | ING loan $372,000 @ 6.49% IO
  Rent received $600/week

OBJECTIVES (client's own words)
  1. "Retire around 62 with roughly $2m so we're not relying on the pension."
  2. "Kill the home loan before Ella starts university."
  3. "Know the kids are covered if something happens to either of us."
  4. "Stop paying for things we don't understand — the old super fund especially."

RISK PROFILE QUESTIONNAIRE
  John scored 58/100 — Balanced. Mary scored 44/100 — Moderate.
`,
    scan_result: {
      first_name: 'John', middle_name: 'Michael', last_name: 'Test',
      date_of_birth: '1978-03-14', occupation: 'Civil Engineering Manager',
      employer_name: 'Harbourline Infrastructure Pty Ltd',
      annual_income: 185000, risk_profile: 'balanced',
      email: 'john.test@example.com', phone: '0412 555 018',
      address: '24 Marlowe Crescent, Epping NSW 2121',
      super_balance: 412500, super_provider: 'Australian Retirement Trust',
      partner_first_name: 'Mary', partner_middle_name: 'Louise', partner_last_name: 'Test',
      partner_date_of_birth: '1980-11-02', partner_occupation: 'Clinical Nurse Specialist',
      partner_annual_income: 96000, partner_risk_profile: 'moderate',
      partner_super_balance: 268400, partner_super_provider: 'HESTA',
    },
  },
  {
    original_name: 'Test - ART Super Statement 2025-26.txt',
    doc_type: 'statement',
    scan_status: 'done',
    body: `AUSTRALIAN RETIREMENT TRUST — ANNUAL STATEMENT
Member: John M Test | Member no. 30294817 | Period: 01/07/2025 - 30/06/2026

Opening balance                              $351,940.22
Employer contributions (SG 12%)               $22,200.00
Contributions tax                             -$3,330.00
Net investment earnings                       $45,120.31
Administration fees                             -$447.60
Investment fees & costs (0.68% p.a.)          -$2,983.15
Insurance premiums (Life + TPD, default)      -$0.00 (cover held retail)
CLOSING BALANCE                              $412,499.78

Investment option: High Growth (88% growth / 12% defensive)
1yr return 11.4% | 5yr p.a. 8.9% | 10yr p.a. 8.1%
Beneficiary nomination: Mary L Test 100% — binding non-lapsing, signed 02/05/2024
`,
    scan_result: {
      super_provider: 'Australian Retirement Trust',
      super_balance: 412500,
      super_contributions: 22200,
    },
  },
  {
    original_name: 'Test - TAL Insurance Schedule.txt',
    doc_type: 'insurance',
    scan_status: 'pending',
    body: `TAL ACCELERATED PROTECTION — POLICY SCHEDULE
Life insured: John Michael Test | Policy 4471820 | Anniversary: 12 September

Life Cover                     $900,000   Premium $1,842.00 p.a. (stepped)
TPD Cover (Any Occupation)     $600,000   Premium $1,236.00 p.a. (stepped)
Structure: held inside Australian Retirement Trust (SMSF-free, super-owned)
Beneficiary: as per fund binding nomination

NOTE FROM ADVISER: TPD definition is Any Occupation — for an engineering
manager an Own Occupation definition inside/outside super split should be
priced before the next anniversary. Cover level also predates the investment
property loan. To review.
`,
    scan_result: null,
  },
];

async function seedDemoClient() {
  // Delete the previous run's uploaded files before the rows that point at them
  // are cascaded away, otherwise re-running would orphan them in UPLOAD_DIR.
  const { rows: oldDocs } = await pool.query(
    `SELECT d.storage_key FROM documents d
       JOIN clients c ON c.id = d.client_id
      WHERE lower(c.first_name) = 'john' AND lower(c.last_name) = 'test'`
  );
  for (const { storage_key: key } of oldDocs) {
    await storage.remove(key).catch(() => {});
  }

  // Files are written outside the transaction (the storage driver is not
  // transactional); the DB rows that point at them are inserted below.
  const stored = [];
  for (const doc of DEMO_DOCS) {
    const buffer = Buffer.from(doc.body, 'utf8');
    const { key, size } = await storage.save(buffer, doc.original_name);
    stored.push({ ...doc, key, size });
  }

  const summary = await withTransaction(async (c) => {
    // ---- Remove any previous run of this demo (FK cascades clear children) ----
    await c.query(
      `DELETE FROM clients
        WHERE lower(first_name) = 'john' AND lower(last_name) = 'test'`
    );
    await c.query('DELETE FROM client_groups WHERE name = $1', [GROUP_NAME]);

    // ---- Group ----
    const { rows: [group] } = await c.query(
      `INSERT INTO client_groups (name, group_type, notes)
       VALUES ($1, 'couple', $2) RETURNING id`,
      [
        GROUP_NAME,
        'Demonstration file — every field populated with fictional data. Safe to edit or delete.',
      ]
    );

    // ---- Client + partner ----
    const { rows: [client] } = await c.query(
      `INSERT INTO clients (
         group_id, first_name, middle_name, last_name, preferred_name,
         email, phone, address, date_of_birth, occupation, risk_profile,
         annual_income, net_worth, status, marital_status, smoker,
         employment_status, employment_basis, employer_name,
         super_balance, super_provider, super_contributions,
         partner_first_name, partner_middle_name, partner_last_name, partner_preferred_name,
         partner_email, partner_phone, partner_date_of_birth, partner_occupation,
         partner_annual_income, partner_risk_profile, partner_marital_status, partner_smoker,
         partner_employment_status, partner_employment_basis, partner_employer_name,
         partner_super_balance, partner_super_provider, partner_super_contributions,
         health_notes, goals_scope, historic_context, other_details, notes
       ) VALUES (
         $1, 'John', 'Michael', 'Test', 'Johnno',
         'john.test@example.com', '0412 555 018', '24 Marlowe Crescent, Epping NSW 2121',
         '1978-03-14', 'Civil Engineering Manager', 'balanced',
         185000, 2312200, 'active', 'married', false,
         'employed', 'full_time', 'Harbourline Infrastructure Pty Ltd',
         412500, 'Australian Retirement Trust', 22200,
         'Mary', 'Louise', 'Test', 'Maz',
         'mary.test@example.com', '0413 555 902', '1980-11-02', 'Clinical Nurse Specialist',
         96000, 'moderate', 'married', false,
         'employed', 'part_time', 'Northern Districts Health',
         268400, 'HESTA', 11520,
         $2, $3, $4, $5, $6
       ) RETURNING id`,
      [
        group.id,
        // health_notes
        'John: type 2 diabetes diagnosed 2021, well managed on metformin, HbA1c 6.2 at last '
        + 'review. Loaded 25% on his 2019 trauma cover as a result. Non-smoker, no other history.\n'
        + 'Mary: no chronic conditions. Elective knee arthroscopy Feb 2024, fully recovered — '
        + 'a 24-month exclusion on the left knee applies to her income protection.\n'
        + 'Family history: John\'s father had a stroke at 71. Both parents of Mary living and well.\n'
        + 'Children: Harry has mild asthma (preventer only, no hospital admissions).',
        // goals_scope
        'SCOPE OF ADVICE — agreed at the 11 June 2026 discovery meeting.\n'
        + 'IN SCOPE: retirement projection and contribution strategy; superannuation consolidation '
        + 'and investment option review; personal insurance needs analysis (life, TPD, trauma, IP); '
        + 'debt reduction sequencing across the home and investment loans; education funding for '
        + 'Ella and Harry; estate and beneficiary nomination review.\n'
        + 'OUT OF SCOPE: direct property acquisition, SMSF establishment, Centrelink entitlements, '
        + 'and business succession — none currently relevant.\n\n'
        + 'GOALS IN THE CLIENTS\' OWN WORDS:\n'
        + '1. "Retire around 62 with roughly $2m so we\'re not relying on the pension."\n'
        + '2. "Kill the home loan before Ella starts university."\n'
        + '3. "Know the kids are covered if something happens to either of us."\n'
        + '4. "Stop paying for things we don\'t understand — the old super fund especially."',
        // historic_context
        'Referred by Stephen Mitchell (existing client, John\'s colleague) in May 2026.\n\n'
        + 'Never received formal advice before. Insurance was placed in 2019 through a direct '
        + 'insurer over the phone with no needs analysis — cover levels predate both the Newcastle '
        + 'investment purchase and Mary\'s move to part time, and have never been reviewed.\n\n'
        + 'John held three super accounts until 2023 when he consolidated two into Australian '
        + 'Retirement Trust himself. The Colonial First State FirstChoice account ($23,800, 1.92% '
        + 'p.a.) was left behind because he believed insurance was attached to it — to be confirmed '
        + 'before consolidating.\n\n'
        + 'The Newcastle unit was bought in 2021 on interest-only terms; the IO period expires '
        + 'March 2027, after which repayments rise by roughly $780 per month. The clients were not '
        + 'aware of this until the discovery meeting.',
        // other_details
        'Preferred contact: John by mobile after 5pm; Mary by email — she works rotating shifts and '
        + 'rarely answers during the day. Both want to attend every meeting together.\n'
        + 'Accountant: Priya Raman, Raman & Co, Carlingford (does both individual returns and the '
        + 'rental schedule). Authority to contact signed 8 July 2026.\n'
        + 'Solicitor: Harrington & Cole, Parramatta — drafted the 2021 wills.\n'
        + 'Mary\'s mother Patricia is likely to need aged-care support within 5-7 years; the clients '
        + 'expect to help and want it factored into cash flow from 2031.\n'
        + 'Both are uncomfortable with anything geared or leveraged beyond the existing property.',
        // notes
        'DEMONSTRATION CLIENT — all information is fictional. Use this file to walk through the '
        + 'full program: profile, financial breakdown, insurance, estate, investments, plan '
        + 'generation, meeting transcripts and follow-up emails.',
      ]
    );
    const cid = client.id;
    const gid = group.id;

    // ---- Family members ----
    const family = [
      ['Ella', 'Test', 'child', '2010-06-18', true, 'Year 10 at Marsden High. Wants to study veterinary science — university funding target set for 2029.'],
      ['Harry', 'Test', 'child', '2013-02-27', true, 'Year 7 at Marsden High. Mild asthma (preventer only). Plays representative football — $2,400/yr in fees and travel.'],
      ['Patricia', 'Doyle', 'parent', '1953-09-09', false, 'Mary\'s mother, lives 10 minutes away in Carlingford. Financially independent (own home, ~$240k super) but likely to need aged-care support within 5-7 years.'],
    ];
    for (const [first, last, rel, dob, dep, notes] of family) {
      await c.query(
        `INSERT INTO family_members (client_id, group_id, first_name, last_name,
           relationship, date_of_birth, is_dependent, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, gid, first, last, rel, dob, dep, notes]
      );
    }

    // ---- Assets (super + shares excluded — see note at top of file) ----
    const assets = [
      ['property', 'Family home — 24 Marlowe Crescent, Epping NSW', 1480000, 'joint', 'Purchased 2014 for $845,000. Bank valuation Mar 2026. Principal place of residence — CGT exempt.'],
      ['property', 'Investment unit — 12/8 Watt Street, Newcastle NSW', 610000, 'joint', 'Purchased Aug 2021 for $525,000. Rented at $600/wk, managed by Coastline Realty. Interest-only period ends March 2027.'],
      ['cash', 'CBA offset & everyday accounts', 68000, 'joint', 'Offset sits against the home loan — saving roughly $4,100 of interest a year at the current rate.'],
      ['cash', 'ING Savings Maximiser — emergency buffer', 45000, 'joint', 'Approximately 3.5 months of expenses. Target is 6 months ($60,000).'],
      ['vehicle', '2022 Toyota Kluger GXL', 42000, 'joint', 'Financed — see Toyota Finance car loan.'],
      ['vehicle', '2018 Mazda CX-5 Maxx Sport', 18500, 'partner', 'Owned outright. Mary\'s car.'],
      ['collectible', 'Home contents, tools & John\'s guitar collection', 35000, 'joint', 'Insured for $60,000 replacement under the Allianz home policy — sum insured to be reviewed.'],
    ];
    for (const [category, name, value, owner, notes] of assets) {
      await c.query(
        `INSERT INTO assets (client_id, group_id, category, name, value, owner, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [cid, gid, category, name, value, owner, notes]
      );
    }

    // ---- Liabilities ----
    const liabilities = [
      ['mortgage', 'Home loan — 24 Marlowe Crescent', 486000, 6.14, 3180, 'Commonwealth Bank', 'joint', 'Principal & interest, 18 years remaining. Offset account attached. Fixed portion expired Feb 2026 and reverted to variable.'],
      ['mortgage', 'Investment loan — Newcastle unit', 372000, 6.49, 2010, 'ING', 'joint', 'Interest only until March 2027, then reverts to P&I — repayments rise by roughly $780/month. Interest is tax deductible.'],
      ['auto_loan', 'Car loan — 2022 Toyota Kluger', 18400, 7.95, 620, 'Toyota Finance', 'self', '31 months remaining. Rate is well above the home loan — a candidate to refinance into the mortgage.'],
      ['credit_card', 'CBA Low Rate Mastercard', 4200, 20.99, 350, 'Commonwealth Bank', 'joint', '$12,000 limit. Balance carried over from the 2025 family holiday — clear this first.'],
      ['student_loan', 'HELP debt (Mary — nursing degree)', 9800, null, null, 'Australian Taxation Office', 'partner', 'Repaid via PAYG withholding. Indexed 4.7% at 1 June 2026. No benefit to voluntary repayment at current indexation.'],
    ];
    for (const [type, name, balance, rate, monthly, lender, owner, notes] of liabilities) {
      await c.query(
        `INSERT INTO liabilities (client_id, group_id, liability_type, name, balance,
           interest_rate, monthly_payment, lender, owner, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [cid, gid, type, name, balance, rate, monthly, lender, owner, notes]
      );
    }

    // ---- Income ----
    const income = [
      ['salary', 'John — Harbourline Infrastructure (gross)', 185000, 'annual', 'self', 'Plus 12% SG. Bonus is discretionary and averaged $8,000 over the last three years — deliberately excluded from planning.'],
      ['salary', 'Mary — Northern Districts Health (gross)', 96000, 'annual', 'partner', '0.8 FTE across four shifts. Returns to full time from Jan 2028 when Harry finishes Year 10 — worth $24,000 p.a. more.'],
      ['rental', 'Rent — 12/8 Watt Street, Newcastle', 600, 'weekly', 'joint', 'Lease to Feb 2027. Agent fee 6.6%. Vacancy averaged 2 weeks a year since purchase.'],
      ['dividends', 'Share portfolio distributions (incl. franking)', 4600, 'annual', 'joint', 'VAS, VGS and the direct CBA holding. Fully reinvested through the DRP.'],
      ['other', 'Bank interest — ING Savings Maximiser', 1850, 'annual', 'joint', 'Bonus rate conditions met every month this financial year.'],
    ];
    for (const [type, name, amount, freq, owner, notes] of income) {
      await c.query(
        `INSERT INTO income_sources (client_id, group_id, income_type, name, amount, frequency, owner, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, gid, type, name, amount, freq, owner, notes]
      );
    }

    // ---- Expenses ----
    const expenses = [
      ['other', 'Income tax & Medicare levy (PAYG, both)', 6050, 'monthly', 'Combined PAYG withheld across both salaries. Rental income and deductions roughly offset at present.'],
      ['housing', 'Home loan repayments', 3180, 'monthly', 'Principal & interest on the CBA home loan.'],
      ['housing', 'Investment loan repayments', 2010, 'monthly', 'Interest only until March 2027 — budget for roughly $2,790/month after that.'],
      ['living', 'Groceries & household', 1850, 'monthly', 'Family of four. Tracked from 12 months of transaction data.'],
      ['discretionary', 'Dining, entertainment & family activities', 1400, 'monthly', 'The clients acknowledge this crept up through 2025 and are comfortable trimming it if needed.'],
      ['education', 'School fees, uniforms & excursions', 1150, 'monthly', 'Marsden High — two children. Rises with each year level.'],
      ['insurance', 'Personal insurance premiums (life, TPD, trauma, IP)', 780, 'monthly', 'Currently paid partly inside super and partly from cash flow — restructuring this is a plan recommendation.'],
      ['transport', 'Fuel, registration, servicing & tolls', 780, 'monthly', 'Two vehicles. John commutes to Chatswood four days a week.'],
      ['transport', 'Car loan repayments', 620, 'monthly', 'Toyota Finance — 31 months remaining.'],
      ['education', 'After-school care & tutoring (Harry)', 480, 'monthly', 'Maths tutoring plus after-school care two days a week.'],
      ['utilities', 'Electricity, gas, water & internet', 340, 'monthly', 'Solar installed 2023 — offsets roughly $95/month in summer.'],
      ['insurance', 'Private health cover — Bupa family gold', 395, 'monthly', 'Held to avoid the Medicare levy surcharge; extras used regularly for the children.'],
      ['housing', 'Council rates, strata & water rates', 420, 'monthly', 'Epping council rates plus Newcastle strata levies of $840 per quarter.'],
      ['housing', 'Home maintenance & repairs', 350, 'monthly', 'Averaged. A bathroom renovation is planned separately — see goals.'],
      ['education', 'Sport, music & extracurricular', 260, 'monthly', 'Representative football for Harry, netball and guitar for Ella.'],
      ['other', 'Phone, streaming & subscriptions', 185, 'monthly', 'Four mobile plans plus streaming services.'],
      ['other', 'Gifts, donations & incidentals', 240, 'monthly', 'Birthdays, Christmas and a monthly donation to the Cancer Council.'],
      ['discretionary', 'Annual family holiday', 9500, 'annual', 'Two weeks each January. 2027 target is a Queensland trip; the Europe trip is a separate goal.'],
    ];
    for (const [category, name, amount, freq, notes] of expenses) {
      await c.query(
        `INSERT INTO expenses (client_id, group_id, category, name, amount, frequency, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [cid, gid, category, name, amount, freq, notes]
      );
    }

    // ---- Insurance policies ----
    const insurance = [
      ['life', 'TAL', 900000, 1842, 'annual', '4471820', 'JOHN — held inside Australian Retirement Trust. Stepped premium. Needs analysis suggests $1.35m is required once the investment loan and education costs are counted — currently underinsured by roughly $450,000.'],
      ['tpd', 'TAL', 600000, 1236, 'annual', '4471821', 'JOHN — Any Occupation definition, held inside super. For an engineering manager an Own Occupation definition (split inside/outside super) should be priced before the 12 September anniversary.'],
      ['trauma', 'AIA Australia', 150000, 2410, 'annual', 'AIA-TR-9932014', 'JOHN — held personally (trauma cannot be held inside super). Loaded 25% for type 2 diabetes at underwriting in 2019.'],
      ['income_protection', 'MLC Life', 138000, 2980, 'annual', 'MLC-IP-778210', 'JOHN — $11,500/month benefit (75% of salary), 90-day waiting period, benefit to age 65, indemnity. Salary has risen since 2019 — the benefit no longer reaches 75% and should be re-set to agreed value where available.'],
      ['life', 'HESTA (default cover)', 350000, 684, 'annual', 'HES-DC-5510342', 'MARY — default unitised cover inside HESTA. Reduces automatically with age. Adequate while the home loan is joint, but should be reviewed alongside John\'s.'],
      ['tpd', 'HESTA (default cover)', 220000, 512, 'annual', 'HES-DC-5510343', 'MARY — Any Occupation, default cover. No income protection is held for Mary at all — the single largest gap on the file.'],
      ['health', 'Bupa', null, 395, 'monthly', 'BUPA-FAM-2210987', 'Family gold hospital + extras. Held to avoid the Medicare levy surcharge (combined income exceeds the threshold).'],
      ['home', 'Allianz', 1540000, 2340, 'annual', 'ALZ-HB-4482201', 'Building $1,480,000 + contents $60,000, Epping. Contents sum insured looks light against the itemised contents — review at renewal in November.'],
      ['auto', 'NRMA', 42000, 1180, 'annual', 'NRMA-CV-9910233', 'Comprehensive on the Kluger. The CX-5 is insured separately at $640 p.a. under the same customer number.'],
    ];
    for (const [type, provider, cover, premium, freq, number, notes] of insurance) {
      await c.query(
        `INSERT INTO insurance_policies (client_id, group_id, policy_type, provider,
           cover_amount, premium, frequency, policy_number, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [cid, gid, type, provider, cover, premium, freq, number, notes]
      );
    }

    // ---- Goals ----
    const goals = [
      ['Clear the CBA credit card', 4200, 0, '2026-12-31', 'high', 'At 20.99% this is the most expensive dollar on the file. Redirect $350/month from the surplus and it clears inside a year.'],
      ['Build the emergency buffer to 6 months', 60000, 45000, '2027-06-30', 'medium', 'Currently at roughly 3.5 months of expenses. $1,250/month from the surplus closes the gap.'],
      ['Renovate the kitchen & main bathroom', 85000, 22000, '2027-09-30', 'low', 'Quoted March 2026. The clients would rather fund it from cash than redraw against the home loan.'],
      ['Europe family trip — school holidays 2028', 25000, 6400, '2028-06-30', 'low', 'Ella finishes Year 12 in 2027. Non-negotiable for the family even if other goals slip.'],
      ['University fund — Ella & Harry', 120000, 18500, '2029-01-31', 'medium', 'Ella starts 2029, Harry 2032. Assumes $30,000 per child for HELP-deferred study plus living costs at home.'],
      ['Pay off the home loan', 486000, 0, '2033-12-01', 'high', 'Requires roughly $1,900/month above the minimum repayment. Achievable from the surplus once the credit card and car loan are gone.'],
      ['Retire at 62 with $2.1m in super', 2100000, 704700, '2040-03-14', 'high', 'John turns 62 in March 2040. Combined super today is $704,700 (ART + HESTA + the legacy CFS account). Projection assumes 6.5% net returns and SG only — additional concessional contributions bring it forward by roughly two years.'],
    ];
    for (const [name, target, current, targetDate, priority, notes] of goals) {
      await c.query(
        `INSERT INTO financial_goals (client_id, group_id, name, target_amount,
           current_amount, target_date, priority, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [cid, gid, name, target, current, targetDate, priority, notes]
      );
    }

    // ---- Estate plan ----
    await c.query(
      `INSERT INTO estate_plans (client_id, has_will, will_date, will_location, executor,
         has_poa, poa_type, poa_attorney, has_testamentary_trust, trust_details,
         beneficiaries, has_binding_nomination, binding_nomination, death_income_goal, notes)
       VALUES ($1, true, '2021-08-12', $2, $3, true, 'both', $4, false, $5, $6, true, $7, 110000, $8)`,
      [
        cid,
        'Originals held by Harrington & Cole Solicitors, Parramatta. Certified copies in the home safe; scanned copies on file.',
        'Mary Test (primary). Substitute: Daniel Test — John\'s brother, Brisbane.',
        'John and Mary appointed for each other, jointly and severally. Substitute attorney: Daniel Test. Enduring guardianship documents signed at the same time.',
        'No testamentary trust in place. Recommended: with two minor children and a projected estate above $3m including insurance proceeds, a testamentary trust would allow income to be distributed to the children at minor-beneficiary tax rates rather than the penalty rates that otherwise apply. Raised with the clients on 16 July 2026 — they have agreed to a referral back to Harrington & Cole.',
        'Everything to the surviving spouse. If both die, the estate is held for Ella and Harry equally with capital released at age 25 and Daniel Test appointed guardian.',
        'ART: Mary Test 100% — binding non-lapsing, signed 02/05/2024, current. HESTA: Mary\'s nomination LAPSED in 2023 and has not been renewed — her $268,400 balance plus $350,000 of default life cover would currently be paid at the trustee\'s discretion. Renewal form issued 17 July 2026, not yet returned.',
        'Wills predate the Newcastle purchase (Aug 2021) and do not mention the property. Neither will contemplates the current insurance proceeds. Estate review is a plan action item, not urgent — but the lapsed HESTA nomination is.',
      ]
    );

    // ---- Current investments (superannuation + share portfolio) ----
    const current = [
      ['Australian Retirement Trust — High Growth', null, 'Superannuation (John)', 412500, 45.6, 'multi-asset', 'growth', 0.68, 'Australian Retirement Trust', '88% growth / 12% defensive. SG contributions only. Binding nomination current.'],
      ['HESTA — Balanced Growth', null, 'Superannuation (Mary)', 268400, 29.7, 'multi-asset', 'balanced', 0.87, 'HESTA', 'Default option, never actively chosen. Fee is 0.19% above the ART equivalent. Beneficiary nomination LAPSED.'],
      ['Vanguard Australian Shares Index ETF', 'VAS', 'Individual (joint names)', 78600, 8.7, 'equity', 'growth', 0.07, 'Vanguard', 'Bought progressively 2019-2024. Fully franked distributions reinvested through the DRP.'],
      ['Vanguard MSCI Index International Shares ETF', 'VGS', 'Individual (joint names)', 53200, 5.9, 'equity', 'growth', 0.18, 'Vanguard', 'Unhedged. The only international exposure held outside super.'],
      ['BetaShares Australian High Interest Cash ETF', 'AAA', 'Individual (joint names)', 26400, 2.9, 'cash', 'conservative', 0.18, 'BetaShares', 'Parked here rather than in the offset — moving it to the offset would be more tax-effective.'],
      ['Commonwealth Bank of Australia (direct)', 'CBA', 'Individual (John)', 22300, 2.5, 'equity', 'balanced', 0.00, 'CommSec', 'Inherited from John\'s grandmother in 2016. Low cost base — a CGT event on sale. Sentimental attachment; the clients want to keep it.'],
      ['iShares Core Composite Bond ETF', 'IAF', 'Individual (joint names)', 18900, 2.1, 'bond', 'conservative', 0.15, 'BlackRock', 'The only defensive holding outside super and cash.'],
      ['Colonial First State FirstChoice — Balanced (legacy)', null, 'Superannuation (John, legacy)', 23800, 2.6, 'multi-asset', 'balanced', 1.92, 'Colonial First State', 'LEGACY ACCOUNT — 1.92% p.a. all-in, roughly $457 a year in avoidable fees. John believes insurance is attached; confirm before consolidating into ART.'],
    ];
    for (const r of current) {
      await c.query(
        `INSERT INTO current_investments (client_id, group_id, fund_name, ticker, account_type,
           balance, allocation_pct, asset_class, risk_profile, fee_pct, provider, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [cid, gid, ...r]
      );
    }

    // ---- Financial plan ----
    const { rows: [plan] } = await c.query(
      `INSERT INTO financial_plans (group_id, client_id, title, status, completeness,
         generated_by_ai, summary, content, metadata)
       VALUES ($1,$2,$3,'in_review',88,true,$4,$5,$6) RETURNING id`,
      [
        gid, cid,
        'Test Household — Wealth & Protection Strategy 2026',
        'Consolidate a legacy super account, close a $450k life cover gap and put Mary\'s '
        + 'income protection in place, then direct a $63,270 annual surplus at the credit card, '
        + 'the emergency buffer and the home loan — targeting a debt-free home by 2033 and '
        + 'retirement at 62 with $2.1m.',
        `# Test Household — Wealth & Protection Strategy

**Prepared for:** John & Mary Test
**Prepared by:** Tristan Biro, Lakeside Financial
**Date:** 23 July 2026
**Status:** Draft for client review

---

## 1. Where you are today

| | |
|---|---|
| Combined gross income | $318,650 p.a. |
| Total assets (incl. super & shares) | $3,202,600 |
| Total liabilities | $890,400 |
| **Net worth** | **$2,312,200** |
| Annual surplus after tax & expenses | **$63,270** |

You are in a strong position: two properties, no consumer debt beyond a card and a
car loan, and a genuine surplus. The issues on this file are not about earning more —
they are about where the surplus goes and what happens if one of you cannot work.

## 2. What needs attention first

**a. Mary has no income protection.** Mary earns $96,000 and has no cover at all. A
six-month absence costs the household roughly $48,000 and would very likely be funded
by the emergency buffer, undoing two years of saving. This is the single largest gap.

**b. John's life cover is short by roughly $450,000.** A needs analysis — clearing both
loans, replacing income to Harry's 21st birthday, funding both children's education and
allowing a $50,000 buffer — indicates $1.35m against the $900,000 currently held.

**c. The HESTA binding nomination has lapsed.** Mary's $268,400 balance and $350,000 of
default life cover would currently be paid at the trustee's discretion rather than
directly to John. The renewal form was issued 17 July and has not been returned. This
costs nothing to fix and should be done this week.

**d. The Colonial First State account is leaking $457 a year.** At 1.92% p.a. against
ART's 0.68%, the legacy account costs roughly $457 more each year for the same exposure.
Confirm whether insurance is attached, then consolidate.

## 3. Recommendations

### Superannuation
1. Consolidate the Colonial First State FirstChoice balance ($23,800) into Australian
   Retirement Trust — **once** attached insurance is confirmed and replaced if needed.
2. Switch Mary's HESTA balance from the default Balanced Growth option to the
   Indexed Balanced option — same asset allocation, 0.32% instead of 0.87%, saving
   roughly $1,475 a year at the current balance.
3. Salary sacrifice $12,000 p.a. from John's income into super. At his marginal rate
   this costs $7,140 of take-home pay to contribute $10,200 net of contributions tax —
   an immediate uplift of roughly $3,060 a year.
4. **Renew Mary's HESTA binding death benefit nomination immediately.**

### Insurance
5. Increase John's life cover from $900,000 to $1,350,000, retained inside super.
6. Restructure John's TPD to Own Occupation, split inside/outside super, at $600,000.
7. Put income protection in place for Mary: $6,000/month benefit, 90-day wait, to age 65,
   noting the 24-month left-knee exclusion from the 2024 arthroscopy.
8. Retain the AIA trauma cover at $150,000 despite the 25% diabetes loading — replacing
   it would mean fresh underwriting on worse terms.

### Debt & cash flow — the surplus, in order
9. **$350/month → the CBA credit card.** Cleared by December 2026 (20.99% is the most
   expensive dollar you own).
10. **$1,250/month → the emergency buffer** until it reaches $60,000 (June 2027).
11. **The remainder → the home loan offset.** From 2027 that is roughly $1,900/month,
    which clears the home loan by late 2033 — before Ella starts university.
12. Refinance the Toyota Finance car loan (7.95%) into the home loan facility, saving
    roughly $420 over the remaining 31 months.
13. **Plan now for March 2027:** the Newcastle interest-only period ends and repayments
    rise by roughly $780 per month. This is already allowed for above.

### Estate
14. Refer back to Harrington & Cole to update both wills — they predate the Newcastle
    purchase — and to consider a testamentary trust. With two minor children and a
    projected estate above $3m including insurance proceeds, a testamentary trust allows
    income to be distributed to the children at ordinary rather than penalty tax rates.

## 4. Where this leaves you

| Goal | Today | Projected |
|---|---|---|
| Credit card cleared | $4,200 owing | Dec 2026 |
| Emergency buffer | $45,000 | $60,000 by Jun 2027 |
| Home loan | $486,000 | Cleared late 2033 |
| Super at John's age 62 | $704,700 | **$2.19m** (6.5% net, incl. salary sacrifice) |
| Life cover gap | -$450,000 | Nil |
| Mary's IP cover | None | $6,000/month |

The retirement target is met roughly 18 months early once the salary-sacrifice
strategy is running. Every recommendation above is funded from the existing surplus —
none of them requires you to earn more or spend less than you do today.

---

*This document is a demonstration file prepared with fictional client data. It is not
personal financial advice.*
`,
        JSON.stringify({
          demo: true,
          prepared_by: 'Tristan Biro, Lakeside Financial',
          review_due: '2027-07-23',
          strategies: ['super consolidation', 'salary sacrifice', 'insurance needs analysis',
            'debt recycling review', 'offset optimisation', 'testamentary trust referral'],
        }),
      ]
    );

    // ---- Recommended investments linked to the plan ----
    const recommended = [
      ['Australian Retirement Trust — Indexed Balanced', null, 'Superannuation (John)', 448300, 47.0, 'multi-asset', 'balanced', 0.32, 'Australian Retirement Trust', 'Same growth/defensive split at 0.32% instead of 0.68%. Absorbs the consolidated Colonial First State balance.'],
      ['HESTA — Indexed Balanced', null, 'Superannuation (Mary)', 268400, 28.1, 'multi-asset', 'balanced', 0.32, 'HESTA', 'Identical asset allocation to her current default option at 0.55% less in fees — roughly $1,475 a year saved at the current balance.'],
      ['Vanguard Australian Shares Index ETF', 'VAS', 'Individual (joint names)', 78600, 8.2, 'equity', 'growth', 0.07, 'Vanguard', 'Retain. Low cost, fully franked, already core to the portfolio.'],
      ['Vanguard MSCI Index International Shares ETF', 'VGS', 'Individual (joint names)', 95000, 10.0, 'equity', 'growth', 0.18, 'Vanguard', 'Increase. International exposure is 6% of the portfolio against a 25% target for a balanced profile.'],
      ['Home loan offset account', null, 'Offset (joint)', 65000, 6.7, 'cash', 'conservative', 0.00, 'Commonwealth Bank', 'Move the BetaShares AAA holding here. A 6.14% after-tax equivalent return beats the ETF and is entirely tax-free.'],
      ['Commonwealth Bank of Australia (direct)', 'CBA', 'Individual (John)', 0, 0.0, 'equity', 'balanced', 0.00, 'CommSec', 'Retain at the clients\' request despite the concentration. Flagged, not recommended — a CGT event on sale and there is sentimental attachment.'],
    ];
    for (const r of recommended) {
      await c.query(
        `INSERT INTO recommended_investments (client_id, group_id, plan_id, fund_name, ticker,
           account_type, target_amount, allocation_pct, asset_class, risk_profile, fee_pct,
           provider, rationale)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [cid, gid, plan.id, ...r]
      );
    }

    // ---- Meeting transcripts ----
    const { rows: [discovery] } = await c.query(
      `INSERT INTO meeting_transcripts (client_id, group_id, title, meeting_date,
         content, summary, action_items)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        cid, gid,
        'Discovery Meeting — John & Mary Test',
        '2026-06-11',
        `[00:00] Adviser: Thanks for coming in, both of you. Stephen speaks very highly of you, John.

[00:12] John: He's been telling me for two years I should sort this out, so here we are.

[00:20] Adviser: Let's start with what prompted the call rather than the numbers.

[00:31] Mary: Honestly? The insurance. We took it out over the phone in 2019, we pay about
$780 a month between us, and neither of us could tell you what it actually covers.

[00:52] John: And I've got an old super account I've never dealt with. Colonial First State.
There's about $24,000 in it. I left it because I think there's insurance attached and I didn't
want to cancel something by accident.

[01:20] Adviser: That's the right instinct — never close a fund with cover attached until the
replacement is in force. We'll confirm it in writing before we touch it. Mary, what about you?

[01:38] Mary: HESTA. Whatever the default is. I've never chosen anything.

[02:05] Adviser: Do you have income protection, Mary?

[02:09] Mary: No. Should I?

[02:11] Adviser: You earn $96,000. If you were off for six months that's around $48,000 gone —
which comes straight out of your emergency savings. That's the biggest single gap I can see so far.

[02:34] John: We hadn't thought about it that way. She's the one on her feet all day too.

[02:48] Adviser: Let's talk about the goals. If we're sitting here in fifteen years, what does
good look like?

[03:02] John: Retire around 62 with roughly $2m so we're not relying on the pension. And the
house paid off before Ella starts university — that's 2029.

[03:24] Mary: And knowing the kids are covered. That's the one that keeps me up.

[03:35] Adviser: Understood. Anything off the table?

[03:41] John: No gearing. We've got the Newcastle place and that's enough borrowing for me.

[03:52] Adviser: Noted. Tell me about Newcastle.

[04:01] John: Bought it in 2021 for $525,000. It's worth about $610,000 now. Rented at $600 a week.

[04:18] Adviser: And the loan is interest only?

[04:20] John: Yes.

[04:22] Adviser: Do you know when the interest-only period ends?

[04:26] John: ... No. Should I?

[04:29] Adviser: March 2027 by the look of the statement. Your repayments will go up by roughly
$780 a month at that point. It's manageable on your surplus, but it needs to be in the plan
rather than a surprise.

[04:52] Mary: That's exactly the sort of thing we don't know about.

[05:10] Adviser: One more — your wills. When were they done?

[05:14] Mary: 2021, with Harrington & Cole.

[05:18] Adviser: Before or after Newcastle?

[05:22] Mary: ... Before. August, I think. We bought in the August too.

[05:31] Adviser: We'll check the dates. And I'll want to look at both your super beneficiary
nominations — super doesn't pass under your will, it follows the nomination you've made with
the fund, and they lapse after three years unless they're non-lapsing.

[05:58] John: Mine's fine, I did it in 2024.

[06:02] Mary: I have absolutely no idea about mine.

[06:06] Adviser: We'll find out. If it's lapsed, your balance and your default life cover would
be paid at the trustee's discretion instead of straight to John. It's a five-minute fix, but it
matters.

[06:30] Adviser: I'll send an authority to contact your fund and your accountant, and we'll get
statements in. Give me three weeks and I'll come back with a strategy.`,
        'First meeting. Trigger was unreviewed 2019 insurance (~$780/month, never analysed) and '
        + 'a legacy Colonial First State super account John was afraid to close. Identified: Mary '
        + 'has no income protection at all (largest gap), Mary\'s HESTA nomination status unknown, '
        + 'the Newcastle interest-only period ends March 2027 (+$780/month) which the clients were '
        + 'unaware of, and the 2021 wills predate the Newcastle purchase. Goals: retire at 62 with '
        + '~$2m, home loan cleared before Ella starts university in 2029, children protected. '
        + 'No gearing beyond the existing property.',
        JSON.stringify([
          { task: 'Send authority to contact ART, HESTA, CFS and the accountant', owner: 'Adviser', due: '2026-06-13', done: true },
          { task: 'Confirm in writing whether insurance is attached to the CFS account', owner: 'Adviser', due: '2026-06-20', done: true },
          { task: 'Confirm the status of Mary\'s HESTA binding nomination', owner: 'Adviser', due: '2026-06-20', done: true },
          { task: 'Confirm the Newcastle interest-only expiry date with ING', owner: 'Adviser', due: '2026-06-20', done: true },
          { task: 'Send through the last two payslips each and the 2025 tax returns', owner: 'Client', due: '2026-06-18', done: true },
          { task: 'Complete the risk profile questionnaire (both)', owner: 'Client', due: '2026-06-18', done: true },
        ]),
      ]
    );

    const { rows: [strategy] } = await c.query(
      `INSERT INTO meeting_transcripts (client_id, group_id, title, meeting_date,
         content, summary, action_items)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        cid, gid,
        'Strategy Presentation — John & Mary Test',
        '2026-07-16',
        `[00:00] Adviser: I've got the full picture now. Before the recommendations — the four
things I said I'd check.

[00:14] Adviser: One, the Colonial First State account. Confirmed in writing: no insurance
attached. It's safe to consolidate, and it's costing you about $457 a year more than ART for
the same exposure.

[00:38] John: So that's just money gone.

[00:41] Adviser: Every year, yes. Two — Mary, your HESTA nomination lapsed in 2023.

[00:52] Mary: Meaning what, exactly?

[00:55] Adviser: Meaning your $268,400 and the $350,000 of default life cover in that fund
would be paid at the trustee's discretion, not automatically to John. It would very likely
end up with him, but it could take months and it isn't guaranteed. The form is in the pack —
it takes five minutes.

[01:22] Mary: I'll do it tonight.

[01:26] Adviser: Three — Newcastle. ING confirmed March 2027, and the repayment goes from
$2,010 to about $2,790 a month. It's in the cash flow.

[01:44] Adviser: Four — your wills were signed 12 August 2021 and you settled on Newcastle
that same month. The wills don't mention the property.

[02:05] John: What's the actual risk there?

[02:08] Adviser: Low, because everything passes to the survivor anyway. But if you both died,
with two minor children and an estate over $3m once insurance pays out, the money would be
held for the kids in a way that gets taxed at penalty rates. A testamentary trust fixes that.
I'd send you back to Harrington & Cole for it — it's their work, not mine.

[02:40] Mary: Fine. Book it.

[02:44] Adviser: Now the insurance, which is why you came in. You're paying $780 a month.
I'm not going to tell you to pay less — I'm going to tell you it's pointed at the wrong things.

[03:05] Adviser: John, your life cover is $900,000. My analysis says you need $1.35m —
that clears both loans, replaces your income until Harry turns 21, funds both kids through
university and leaves a $50,000 buffer. So you're short by about $450,000.

[03:34] John: I assumed $900,000 was a lot.

[03:38] Adviser: It sounds like a lot until you subtract $858,000 of debt. Mary — you have no
income protection. That's the one I want fixed first. $6,000 a month, 90-day wait, to age 65.
There's a two-year exclusion on the left knee from the 2024 surgery, which I can't avoid.

[04:12] Mary: I'd take that.

[04:16] John: What's all this going to cost us?

[04:19] Adviser: Adding Mary's IP and increasing your life cover adds roughly $210 a month.
The super fee savings — the CFS consolidation plus switching Mary to HESTA's indexed option —
come to about $1,930 a year, which is $160 a month. So the net cost is around $50 a month for
$450,000 more cover and income protection Mary doesn't currently have.

[04:52] John: Put like that it's not really a decision.

[05:00] Adviser: Then the surplus. You're running about $63,000 a year spare. Right now it's
just sitting in the everyday account. In order: $350 a month kills the credit card by
December — 20.99% is the most expensive dollar you own. Then $1,250 a month takes the buffer
from $45,000 to $60,000, which is six months of expenses, by June next year. Everything left
goes into the offset.

[05:38] John: And that gets the house paid off when?

[05:41] Adviser: Late 2033. Ella starts in 2029, so you're not there by then — but you're
close, and you'd be debt-free on the home five years before you retire.

[05:58] Mary: I can live with that.

[06:05] Adviser: Last one, and it's the one that does the most work. Salary sacrifice $12,000
a year from John's pay into super. It costs you $7,140 of take-home to put $10,200 into super
after contributions tax. That's about $3,060 a year you're currently handing to the ATO.

[06:34] John: Why has nobody ever told me that?

[06:37] Adviser: Because nobody was looking. With that running, the projection has you at
$2.19m at 62 — about eighteen months ahead of your target.

[06:55] John: Send it through. We'll read it properly and come back to you.

[07:02] Adviser: I'll have the statement of advice to you by the end of next week.`,
        'Presented the strategy. Confirmed: no insurance attached to the CFS account (safe to '
        + 'consolidate, ~$457/yr saving), Mary\'s HESTA nomination lapsed 2023 (form issued, she '
        + 'agreed to return it that night), Newcastle IO expires March 2027 (+$780/month, now in '
        + 'the cash flow), and the 2021 wills predate the Newcastle purchase. Recommendations '
        + 'accepted in principle: increase John\'s life cover to $1.35m, add $6,000/month IP for '
        + 'Mary (24-month left-knee exclusion), consolidate and re-index both super accounts, '
        + '$12,000/yr salary sacrifice, and direct the $63,270 surplus at the card, then the '
        + 'buffer, then the offset. Net insurance cost after fee savings is roughly $50/month. '
        + 'Clients want to read the SOA before signing. Testamentary trust referral agreed.',
        JSON.stringify([
          { task: 'Return the HESTA binding nomination form', owner: 'Client (Mary)', due: '2026-07-17', done: false },
          { task: 'Issue the statement of advice', owner: 'Adviser', due: '2026-07-24', done: false },
          { task: 'Obtain quotes: John life $1.35m, TPD own-occupation $600k, Mary IP $6,000/month', owner: 'Adviser', due: '2026-07-22', done: true },
          { task: 'Lodge the CFS consolidation once cover is confirmed in force', owner: 'Adviser', due: '2026-08-15', done: false },
          { task: 'Set up the $12,000 p.a. salary sacrifice with Harbourline payroll', owner: 'Client (John)', due: '2026-08-01', done: false },
          { task: 'Refer to Harrington & Cole for will update + testamentary trust', owner: 'Adviser', due: '2026-08-08', done: false },
          { task: 'Book the SOA presentation meeting', owner: 'Adviser', due: '2026-07-30', done: false },
        ]),
      ]
    );

    // ---- Follow-up emails ----
    await c.query(
      `INSERT INTO followup_emails (client_id, group_id, transcript_id, subject, body, status, generated_by_ai)
       VALUES ($1,$2,$3,$4,$5,'sent',true)`,
      [
        cid, gid, discovery.id,
        'Great to meet you both — and the four things I\'m chasing up',
        `Hi John and Mary,

Thank you both for your time this morning, and John — pass my thanks to Stephen for the introduction.

It's a genuinely strong position to be working with: two properties, a real surplus, and no
consumer debt to speak of beyond the card and the car. Most of what we discussed is about
pointing what you already have at the right things.

A quick recap of what stood out:

**Insurance.** You're paying around $780 a month for cover neither of you can describe. That's
not a criticism — it was sold to you over the phone without a needs analysis. Mary, the part
that concerns me most is that you have no income protection at all. On $96,000, six months off
work is roughly $48,000 straight out of your savings.

**The Colonial First State account.** Leaving it alone was the right instinct while you thought
insurance was attached. I'll confirm that in writing before we go near it.

**Mary's HESTA nomination.** Super doesn't pass under your will — it follows the nomination you
make with the fund, and those lapse after three years unless they're non-lapsing. I'll find out
where yours stands.

**Newcastle.** The interest-only period looks to end in March 2027, which will add roughly $780
a month to the repayment. I'll confirm the date with ING. It's very manageable on your surplus —
it just needs to be planned for rather than arrive as a surprise.

**From me:**
- Authorities to ART, HESTA, Colonial First State and Priya at Raman & Co (sent today)
- Written confirmation on the CFS insurance question
- The status of Mary's HESTA nomination
- The Newcastle interest-only expiry, confirmed with ING

**From you:**
- Last two payslips each and your 2025 tax returns
- The risk profile questionnaire (link below — about ten minutes each)

Give me three weeks from when the statements land and I'll come back with a full strategy.

Kind regards,

Tristan Biro
Lakeside Financial | AR 001313019 | Pareto Group AFSL 418700`,
      ]
    );

    await c.query(
      `INSERT INTO followup_emails (client_id, group_id, transcript_id, subject, body, status, generated_by_ai)
       VALUES ($1,$2,$3,$4,$5,'draft',true)`,
      [
        cid, gid, strategy.id,
        'Follow-up from Thursday — your strategy, and the one thing to do tonight',
        `Hi John and Mary,

Thanks for Thursday. You asked good, hard questions and I'd rather that than polite nodding.

**One thing tonight, please.** Mary — the HESTA binding nomination form is in the pack. Your
nomination lapsed in 2023, which means your $268,400 balance and the $350,000 of default life
cover in that fund would currently be paid at the trustee's discretion rather than straight to
John. It would probably reach him eventually, but it isn't guaranteed and it isn't quick. The
form takes five minutes and it's the only thing on this list that's genuinely time-sensitive.

**The four things I said I'd check, confirmed:**

- **Colonial First State** — no insurance attached, confirmed in writing. Safe to consolidate.
  It's costing about $457 a year more than ART for the same exposure.
- **Mary's HESTA nomination** — lapsed 2023, as above.
- **Newcastle** — ING confirm interest-only ends March 2027. Repayments go from $2,010 to about
  $2,790 a month. It's already built into the cash flow.
- **Your wills** — signed 12 August 2021, the same month you settled on Newcastle. They don't
  mention the property.

**What I'm recommending, in short:**

- Increase John's life cover from $900,000 to $1.35m — that clears both loans, replaces income
  until Harry turns 21, funds both children through university and leaves a $50,000 buffer.
- Put income protection in place for Mary: $6,000 a month, 90-day wait, to age 65. There's a
  24-month exclusion on the left knee from the 2024 surgery that I can't get around.
- Consolidate the Colonial First State balance into ART, and move both super accounts to the
  indexed options — the same asset allocation for roughly $1,930 a year less in fees.
- Salary sacrifice $12,000 a year from John's pay. It costs $7,140 of take-home to put $10,200
  into super — about $3,060 a year you're currently giving the ATO instead.
- Direct the surplus in order: $350/month to the credit card (gone by December), $1,250/month
  to the buffer until it hits $60,000 (June 2027), then everything to the offset. That clears
  the home loan in late 2033.

The insurance changes and the fee savings roughly cancel out — net cost is about $50 a month
for $450,000 more cover plus income protection Mary doesn't have today.

With all of it running, the projection has you at **$2.19m at 62** — around eighteen months
ahead of the target you set.

**Next steps:** the statement of advice will be with you by the end of next week. John, worth
starting the salary sacrifice paperwork with Harbourline payroll now — it usually takes a pay
cycle or two. And I'll make the introduction back to Harrington & Cole about the wills.

Any questions before then, just call.

Kind regards,

Tristan Biro
Lakeside Financial | AR 001313019 | Pareto Group AFSL 418700`,
      ]
    );

    // ---- Documents ----
    for (const doc of stored) {
      await c.query(
        `INSERT INTO documents (client_id, group_id, original_name, storage_key, doc_type,
           mime_type, size_bytes, extracted_text, scan_status, scan_result)
         VALUES ($1,$2,$3,$4,$5,'text/plain',$6,$7,$8,$9)`,
        [
          cid, gid, doc.original_name, doc.key, doc.doc_type, doc.size,
          doc.body, doc.scan_status, doc.scan_result ? JSON.stringify(doc.scan_result) : null,
        ]
      );
    }

    return { cid, gid };
  });

  console.log(
    `[seed:demo] John & Mary Test created — client ${summary.cid}\n`
    + '           1 group, 1 client + partner, 3 family members, 7 assets, 5 liabilities,\n'
    + '           5 income sources, 18 expenses, 9 insurance policies, 7 goals, 1 estate plan,\n'
    + '           8 holdings, 6 recommendations, 1 plan, 2 transcripts, 2 emails, 3 documents.'
  );
}

seedDemoClient()
  .then(() => pool.end())
  .catch((err) => {
    console.error('[seed:demo] failed:', err.message);
    pool.end();
    process.exit(1);
  });
