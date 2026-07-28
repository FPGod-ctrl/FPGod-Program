import { describe, it, expect } from 'vitest';
import { parseStatementText, deligature, cfsDate } from '../services/cfsStatementText.js';

/**
 * Fixtures reproduce the real CFS "Statement Report" layout — including the
 * ligature NULs pdf-parse emits and the run-together valuation columns — but
 * with invented names, account numbers and addresses rather than real clients.
 */

const NUL = String.fromCharCode(0);

const SUPER_STATEMENT = `
Page 1 of 5
Report period: 01 Jul. 2025 - 30 Jun. 2026
Date prepared: 07 Jul. 2026

Adviser: Tristan Biro
Pareto Group Pty Ltd
Adviser contact number: 95965111
As at date prepared
Address:1 EXAMPLE ST
 SOMEWHERE VIC 3000
Email address:jane.sample@example.com
Date of birth:23 Feb. 1965
Account number:0110 3906 4536
Mobile:0400000000
TFN Status:Supplied
As at 30 Jun. 2026
Mrs Jane Sample
Statement Report
FirstChoice Wholesale Personal Super
Your details
Your balance
Your account valuation
InvestmentsOption codeAPIR codeUnitsUnit priceOption valueAllocation
Ausbil Aust Active Equity036FSF0585AU6,836.5107$6.6857$45,706.8615.7%
CFS Index Global Share041FSF0622AU16,588.0155$5.5905$92,735.3031.8%
RQI Australian Value241FSF1003AU9,340.1978$5.5745$52,066.9317.8%
Account value$190,509.09100%

Page 2 of 5
Your account summary
Amount
Opening balance as at 1 July 2025$160,305.54
Your investments
Contributions and rollovers
Employer$10,899.27
Your withdrawals
Government taxes
Contributions taxes-$1,634.92
Closing balance as at 30 June 2026$190,509.09

Page 3 of 5
Your asset allocation
Your account balance
$190,509.09
Defensive assets
Cash
$1,905.09
1.00%
Growth assets
Aus Shares
$97,773.79
51.32%
Global Shares*
$90,830.21
47.68%
* The asset type includes allocations to alternatives
Your bene${NUL}ciary details - Non-lapsing death bene${NUL}t nomination
`;

// Same template, but with an adviser service fee actually being charged.
const FEE_PAYING_STATEMENT = `
Report period: 01 Jul. 2025 - 30 Jun. 2026
Adviser: Tristan Biro
Email address:paying.client@example.com
Date of birth:10 Mar. 1970
Account number:0110 4593 2882
As at 30 Jun. 2026
Mr Paying Client
Statement Report
FirstChoice Wholesale Allocated Pension
Your account valuation
InvestmentsOption codeAPIR codeUnitsUnit priceOption valueAllocation
FSI Strategic Cash057FSF0075AU10,000.0000$1.0112$10,112.00100.0%
Account value$10,112.00100%
Your account summary
Amount
Opening balance as at 1 July 2025$9,000.00
Your withdrawals
Fees
Admin Fee (Investor Fee)$120.00
Adviser service fee (includes reversals)$550.00
Closing balance as at 30 June 2026$10,112.00
`;

// One PDF, three accounts for the same member (as CFS emits for pension splits).
const MULTI_ACCOUNT = `
Report period: 01 Jul. 2025 - 30 Jun. 2026
Adviser: Tristan Biro
Email address:multi.member@example.com
Date of birth:23 Nov. 1937
Account number:0510 3918 7432
As at 30 Jun. 2026
Mr Multi Member
Statement Report
FirstChoice Wholesale Allocated Pension
Your account valuation
InvestmentsOption codeAPIR codeUnitsUnit priceOption valueAllocation
FSI Strategic Cash057FSF0075AU16,700.0000$1.0110$16,883.40100.0%
Account value$16,883.40100%
Email address:multi.member@example.com
Date of birth:23 Nov. 1937
Account number:0510 4231 1474
As at 30 Jun. 2026
Mr Multi Member
Statement Report
FirstChoice Wholesale Term Allocated Pension
Your account valuation
InvestmentsOption codeAPIR codeUnitsUnit priceOption valueAllocation
CFS Index Australian Bond086FSF0618AU11,300.0000$1.0111$11,425.73100.0%
Account value$11,425.73100%
`;

// A non-super statement appends an extra dollar column (unrealised gain).
const INVESTMENTS_STATEMENT = `
Report period: 01 Jul. 2025 - 30 Jun. 2026
Adviser: Tristan Biro
Account number:0110 2222 3333
As at 30 Jun. 2026
Ms Invest Only
Statement Report
FirstChoice Wholesale Investments
Your account valuation
InvestmentsOption codeAPIR codeUnitsUnit priceOption valueAllocation
Diversi${NUL}ed Fund005FSF0022AU24,637.8724$1.6372$40,337.1256.4%$5,216.11
Imputation Fund001FSF0013AU10,154.2507$3.0680$31,153.2443.6%$2,413.45
Account value$71,490.36100%
`;

const CLOSED_ACCOUNT = `
Page 1 of 1
Report period: 01 Jul. 2025 - 30 Jun. 2026
Adviser: Tristan Biro
Statement Report
Your account summary
Amount
Total deducted amount for reporting period$0.00
`;

describe('deligature', () => {
  it('expands the ligature placeholder using the surrounding word', () => {
    expect(deligature(`bene${NUL}ciary`)).toBe('beneficiary');
    expect(deligature(`re${NUL}ected`)).toBe('reflected');
    expect(deligature(`Diversi${NUL}ed`)).toBe('Diversified');
    expect(deligature(`Whit${NUL}eld`)).toBe('Whitfield');
  });

  it('defaults to "fi" for words it does not recognise', () => {
    expect(deligature(`unknown${NUL}word`)).toBe('unknownfiword');
  });

  it('leaves clean text untouched', () => {
    expect(deligature('Ausbil Aust Active Equity')).toBe('Ausbil Aust Active Equity');
    expect(deligature('')).toBe('');
  });
});

describe('cfsDate', () => {
  it('reads the CFS abbreviated format', () => {
    expect(cfsDate('30 Jun. 2026')).toBe('2026-06-30');
    expect(cfsDate('1 July 2025')).toBe('2025-07-01');
    expect(cfsDate('23 Feb. 1965')).toBe('1965-02-23');
  });

  it('rejects anything else', () => {
    expect(cfsDate('as at date prepared')).toBeNull();
    expect(cfsDate('')).toBeNull();
  });
});

describe('parseStatementText — super statement', () => {
  const { accounts, warnings } = parseStatementText(SUPER_STATEMENT);
  const [a] = accounts;

  it('reads one account with its identity', () => {
    expect(warnings).toEqual([]);
    expect(accounts).toHaveLength(1);
    expect(a.account_number).toBe('011039064536');
    expect(a.account_name).toBe('Mrs Jane Sample');
    expect(a.product).toBe('FirstChoice Wholesale Personal Super');
    expect(a.account_type).toBe('super');
  });

  it('reads balances and the valuation date', () => {
    expect(a.balance).toBe(190509.09);
    expect(a.opening_balance).toBe(160305.54);
    expect(a.as_at_date).toBe('2026-06-30');
    expect(a.report_period_start).toBe('2025-07-01');
    expect(a.report_period_end).toBe('2026-06-30');
  });

  it('reads personal details printed above the account number', () => {
    expect(a.email).toBe('jane.sample@example.com');
    expect(a.date_of_birth).toBe('1965-02-23');
  });

  it('splits the run-together valuation columns', () => {
    expect(a.holdings).toHaveLength(3);
    const ausbil = a.holdings.find((h) => h.option_name === 'Ausbil Aust Active Equity');
    expect(ausbil.option_code).toBe('FSF0585AU');
    expect(ausbil.units).toBe(6836.5107);
    expect(ausbil.unit_price).toBe(6.6857);
    expect(ausbil.balance).toBe(45706.86);
    expect(ausbil.allocation_pct).toBe(15.7);
  });

  it('reads the growth / defensive allocation', () => {
    expect(a.allocations).toHaveLength(3);
    const cash = a.allocations.find((x) => x.asset_class === 'Cash');
    expect(cash).toMatchObject({ bucket: 'defensive', value: 1905.09, pct: 1 });
    // The trailing footnote marker is not part of the asset class name.
    expect(a.allocations.find((x) => x.asset_class === 'Global Shares').bucket).toBe('growth');
    expect(a.growth_pct).toBeCloseTo(99, 2);
  });

  it('records no adviser fee as not_paying — the whole point of the exercise', () => {
    expect(a.adviser_fee_amount).toBe(0);
    expect(a.adviser_fee_pct).toBeNull();
    expect(a.fee_status).toBe('not_paying');
  });
});

describe('parseStatementText — fee-paying statement', () => {
  const [a] = parseStatementText(FEE_PAYING_STATEMENT).accounts;

  it('picks up a real adviser service fee and derives its rate', () => {
    expect(a.fee_status).toBe('paying');
    expect(a.adviser_fee_amount).toBe(550);
    expect(a.adviser_fee_pct).toBeCloseTo((550 / 10112) * 100, 3);
  });

  it('does not mistake the administration fee for an adviser fee', () => {
    expect(a.adviser_fee_amount).not.toBe(120);
  });

  it('classifies a pension product', () => {
    expect(a.account_type).toBe('pension');
  });
});

describe('parseStatementText — multi-account PDF', () => {
  const { accounts } = parseStatementText(MULTI_ACCOUNT);

  it('splits every account in the file', () => {
    expect(accounts).toHaveLength(2);
    expect(accounts.map((a) => a.account_number)).toEqual(['051039187432', '051042311474']);
    expect(accounts.map((a) => a.balance)).toEqual([16883.4, 11425.73]);
  });

  it('keeps each account with its own product and holdings', () => {
    expect(accounts[0].product).toBe('FirstChoice Wholesale Allocated Pension');
    expect(accounts[1].product).toBe('FirstChoice Wholesale Term Allocated Pension');
    expect(accounts[0].holdings[0].option_name).toBe('FSI Strategic Cash');
    expect(accounts[1].holdings[0].option_name).toBe('CFS Index Australian Bond');
  });

  it('gives every account the member details, not just the first', () => {
    accounts.forEach((a) => {
      expect(a.email).toBe('multi.member@example.com');
      expect(a.date_of_birth).toBe('1937-11-23');
    });
  });
});

describe('parseStatementText — non-super statement', () => {
  const [a] = parseStatementText(INVESTMENTS_STATEMENT).accounts;

  it('handles the extra trailing dollar column', () => {
    expect(a.holdings).toHaveLength(2);
    expect(a.balance).toBe(71490.36);
    expect(a.account_type).toBe('investment');
  });

  it('repairs ligatures inside option names', () => {
    expect(a.holdings.map((h) => h.option_name)).toContain('Diversified Fund');
  });
});

describe('parseStatementText — unusable input', () => {
  it('warns rather than inventing an account for a closed statement', () => {
    const { accounts, warnings } = parseStatementText(CLOSED_ACCOUNT);
    expect(accounts).toEqual([]);
    expect(warnings[0]).toMatch(/no account number/i);
  });

  it('handles empty input safely', () => {
    expect(parseStatementText('').accounts).toEqual([]);
    expect(parseStatementText(null).accounts).toEqual([]);
  });
});
