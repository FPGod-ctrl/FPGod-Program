import { describe, it, expect } from 'vitest';
import {
  num, asDate, expandYear, detectHeader, buildAccounts, summarise, classifyAccount,
} from '../services/cfsImport.js';
import { matchAccounts, nameCandidates, isEntity } from '../services/cfsMatch.js';

/**
 * Two shapes stand in for the real exports: a book-level FUM/fee report (one
 * row per account) and a portfolio valuation (one row per investment option,
 * with the account identity printed only on its first row).
 */

const FUM_SHEET = [
  ['Colonial First State — Adviser Funds Under Management', '', '', '', '', ''],
  [],
  ['Adviser: Tristan Biro (TBIRO)', '', '', '', '', ''],
  ['As at 30 June 2026', '', '', '', '', ''],
  [],
  ['Account Number', 'Account Name', 'Product', 'Account Balance', 'Adviser Fee %', 'Adviser Fee $ p.a.'],
  ['053812345', 'Chapman, Bernadette', 'FirstChoice Wholesale Personal Super', 284500.55, 0.66, 1877.7],
  ['053812346', 'Chapman, Richard', 'FirstChoice Wholesale Pension', '$512,300.00', '0.55%', '$2,817.65'],
  ['053899001', 'Lyon, Ian', 'FirstChoice Investments', '1,250,000', '', '6,875.00'],
  ['053877123', 'Clay Superannuation Fund', 'FirstWrap Plus Super', 95000, 0.77, ''],
  ['', 'Total', '', 2141800.55, '', 11570.35],
];

const VALUATION_SHEET = [
  ['CFS Portfolio Valuation', '', '', '', '', '', ''],
  ['Valuation Date: 30/06/2026', '', '', '', '', '', ''],
  [],
  ['Account No.', 'Investor Name', 'Investment Option', 'Asset Class', 'Units', 'Unit Price', 'Option Value'],
  ['053812345', 'Chapman, Bernadette', 'FirstChoice Wholesale Australian Share', 'Australian Equities', 12000, 2.5, 30000],
  ['', '', 'FirstChoice Wholesale Global Share', 'International Equities', 8000, 3.125, 25000],
  ['', '', 'FirstChoice Wholesale Fixed Interest', 'Fixed Income', 5000, 1.0, 5000],
  ['053812346', 'Chapman, Richard', 'FirstChoice Wholesale Balanced', 'Diversified', 20000, 2.0, 40000],
  ['', '', 'FirstChoice Wholesale Cash', 'Cash', 10000, 1.0, 10000],
];

describe('num', () => {
  it('strips currency, percent and thousands separators', () => {
    expect(num('$1,234.56')).toBe(1234.56);
    expect(num('0.55%')).toBe(0.55);
    expect(num(' 1 250 000 ')).toBe(1250000);
    expect(num(42)).toBe(42);
  });

  it('reads accounting-style negatives', () => {
    expect(num('(500)')).toBe(-500);
    expect(num('($1,200.50)')).toBe(-1200.5);
  });

  it('returns null for blanks and placeholders', () => {
    for (const v of ['', '  ', '-', 'N/A', 'nil', 'TBC', null, undefined]) {
      expect(num(v)).toBeNull();
    }
  });
});

describe('asDate', () => {
  it('reads Australian day-first dates', () => {
    expect(asDate('30/06/2026')).toBe('2026-06-30');
    expect(asDate('7/6/26')).toBe('2026-06-07');
  });

  it('passes through ISO and Date objects', () => {
    expect(asDate('2026-06-30')).toBe('2026-06-30');
    expect(asDate(new Date(Date.UTC(2026, 5, 30)))).toBe('2026-06-30');
  });

  it('rejects junk', () => {
    expect(asDate('not a date')).toBeNull();
    expect(asDate('')).toBeNull();
  });
});

describe('detectHeader', () => {
  it('finds the header beneath the report preamble', () => {
    const h = detectHeader(FUM_SHEET);
    expect(h.index).toBe(5);
    expect(h.map.account_number).toBe(0);
    expect(h.map.account_name).toBe(1);
    expect(h.map.product).toBe(2);
    expect(h.map.account_balance).toBe(3);
    expect(h.map.adviser_fee_pct).toBe(4);
    expect(h.map.adviser_fee_amount).toBe(5);
  });

  it('maps a valuation sheet to option columns', () => {
    const h = detectHeader(VALUATION_SHEET);
    expect(h.index).toBe(3);
    expect(h.map.option_name).toBe(2);
    expect(h.map.asset_class).toBe(3);
    expect(h.map.holding_balance).toBe(6);
    // "Option Value" must not be mistaken for the account balance.
    expect(h.map.account_balance).toBeUndefined();
  });
});

describe('buildAccounts — FUM export', () => {
  const { accounts } = buildAccounts(FUM_SHEET, detectHeader(FUM_SHEET).map, 5);

  it('builds one account per row and drops the totals row', () => {
    expect(accounts).toHaveLength(4);
    expect(accounts.map((a) => a.account_name)).not.toContain('Total');
  });

  it('parses formatted currency and percentages', () => {
    const richard = accounts.find((a) => a.account_number === '053812346');
    expect(richard.balance).toBe(512300);
    expect(richard.adviser_fee_pct).toBe(0.55);
    expect(richard.adviser_fee_amount).toBe(2817.65);
  });

  it('derives the missing side of the fee', () => {
    // Fee $ only → percentage back-solved from the balance.
    const ian = accounts.find((a) => a.account_number === '053899001');
    expect(ian.adviser_fee_amount).toBe(6875);
    expect(ian.adviser_fee_pct).toBe(0.55);

    // Fee % only → dollars forward-solved.
    const clay = accounts.find((a) => a.account_number === '053877123');
    expect(clay.adviser_fee_pct).toBe(0.77);
    expect(clay.adviser_fee_amount).toBe(731.5);
  });

  it('classifies products into super / pension / investment', () => {
    expect(accounts.find((a) => a.account_number === '053812345').account_type).toBe('super');
    expect(accounts.find((a) => a.account_number === '053812346').account_type).toBe('pension');
    expect(accounts.find((a) => a.account_number === '053899001').account_type).toBe('investment');
  });
});

describe('buildAccounts — portfolio valuation', () => {
  const header = detectHeader(VALUATION_SHEET);
  const { accounts } = buildAccounts(VALUATION_SHEET, header.map, header.index);

  it('groups option rows under their account, carrying identity forward', () => {
    expect(accounts).toHaveLength(2);
    const bernie = accounts.find((a) => a.account_number === '053812345');
    expect(bernie.account_name).toBe('Chapman, Bernadette');
    expect(bernie.holdings).toHaveLength(3);
  });

  it('sums holdings into the account balance when none is given', () => {
    const bernie = accounts.find((a) => a.account_number === '053812345');
    expect(bernie.balance).toBe(60000);
  });

  it('computes allocation percentages that total 100', () => {
    const bernie = accounts.find((a) => a.account_number === '053812345');
    const total = bernie.holdings.reduce((s, h) => s + h.allocation_pct, 0);
    expect(total).toBeCloseTo(100, 2);
    expect(bernie.holdings.find((h) => h.asset_class === 'Australian Equities').allocation_pct).toBe(50);
  });
});

describe('summarise', () => {
  const { accounts } = buildAccounts(FUM_SHEET, detectHeader(FUM_SHEET).map, 5);
  const s = summarise(accounts);

  it('totals FUM and fee revenue across the book', () => {
    expect(s.accountCount).toBe(4);
    expect(s.totalFum).toBeCloseTo(2141800.55, 2);
    expect(s.totalFees).toBeCloseTo(1877.7 + 2817.65 + 6875 + 731.5, 2);
  });

  it('reports a weighted average fee', () => {
    expect(s.avgFeePct).toBeCloseTo((s.totalFees / s.totalFum) * 100, 4);
  });
});

describe('classifyAccount', () => {
  it('reads the product string', () => {
    expect(classifyAccount('FirstChoice Wholesale Personal Super')).toBe('super');
    expect(classifyAccount('FirstChoice Allocated Pension')).toBe('pension');
    expect(classifyAccount('Transition to Retirement')).toBe('pension');
    expect(classifyAccount('FirstWrap Plus Investments')).toBe('investment');
    expect(classifyAccount('')).toBe('other');
  });
});

describe('nameCandidates', () => {
  it('reads surname-first and given-name-first forms', () => {
    expect(nameCandidates('Chapman, Bernadette')).toEqual([{ first: 'bernadette', last: 'chapman' }]);
    expect(nameCandidates('Bernadette Chapman')).toContainEqual({ first: 'bernadette', last: 'chapman' });
    // CFS also emits "SURNAME FIRSTNAME" with no comma, so both readings are offered.
    expect(nameCandidates('CHAPMAN BERNADETTE')).toContainEqual({ first: 'bernadette', last: 'chapman' });
  });

  it('strips titles and middle names', () => {
    expect(nameCandidates('Mr Robert B Thomson')).toContainEqual({ first: 'robert', last: 'thomson' });
  });

  it('splits couples sharing a surname', () => {
    const c = nameCandidates('John & Mary Smith');
    expect(c).toContainEqual({ first: 'john', last: 'smith' });
    expect(c).toContainEqual({ first: 'mary', last: 'smith' });
  });
});

describe('matchAccounts', () => {
  const clients = [
    { id: 'c1', first_name: 'Bernadette', last_name: 'Chapman', partner_first_name: 'Richard', partner_last_name: 'Chapman' },
    { id: 'c2', first_name: 'Ian', last_name: 'Lyon', partner_first_name: 'Isabel', partner_last_name: 'Lyon' },
    { id: 'c3', first_name: 'Sarah', last_name: 'Conlon', partner_first_name: null, partner_last_name: null },
    { id: 'c4', first_name: 'Daniel', last_name: 'Cox', partner_first_name: null, partner_last_name: null },
    { id: 'c5', first_name: 'Lisa', last_name: 'Cox', partner_first_name: null, partner_last_name: null },
  ];

  it('links an exact name match with high confidence', () => {
    const [a] = matchAccounts([{ account_name: 'Chapman, Bernadette' }], clients);
    expect(a.client_id).toBe('c1');
    expect(a.match_status).toBe('matched');
    expect(a.match_confidence).toBe('high');
  });

  it('links a partner to their household file', () => {
    const [a] = matchAccounts([{ account_name: 'Chapman, Richard' }], clients);
    expect(a.client_id).toBe('c1');
  });

  it('refuses to guess between two clients sharing a surname', () => {
    const [a] = matchAccounts([{ account_name: 'Cox' }], clients);
    expect(a.client_id).toBeNull();
    expect(a.match_status).toBe('unmatched');
    expect(a.match_options.map((o) => o.id).sort()).toEqual(['c4', 'c5']);
  });

  it('flags entities for manual linking instead of name-matching them', () => {
    const [a] = matchAccounts([{ account_name: 'Clay Superannuation Fund' }], clients);
    expect(a.client_id).toBeNull();
    expect(a.match_note).toMatch(/entity/i);
    expect(isEntity('Bobear Super Pty Ltd')).toBe(true);
    expect(isEntity('Chapman, Bernadette')).toBe(false);
  });

  it('leaves an unknown name unmatched rather than attaching it to anyone', () => {
    const [a] = matchAccounts([{ account_name: 'Nobody, Random' }], clients);
    expect(a.client_id).toBeNull();
    expect(a.match_status).toBe('unmatched');
  });
});

describe('num — unit suffixes', () => {
  it('scales k / m / bn rather than dropping them', () => {
    expect(num('$1.2m')).toBe(1200000);
    expect(num('120k')).toBe(120000);
    expect(num('$1.5 bn')).toBe(1500000000);
    expect(num('(2.5k)')).toBe(-2500);
    expect(num('$1,234.56')).toBe(1234.56);
  });
});

describe('asDate — two-digit years', () => {
  const now = new Date(2026, 9, 27);
  it('rolls years after the current one back to the 1900s', () => {
    expect(expandYear('65', now)).toBe(1965);
    expect(expandYear('27', now)).toBe(1927);
    expect(expandYear('26', now)).toBe(2026);
    expect(expandYear('05', now)).toBe(2005);
  });

  it('reads a two-digit birth year as last century', () => {
    expect(asDate('23/02/65')).toBe('1965-02-23');
  });
});

describe('buildAccounts — units × price holdings', () => {
  const SHEET = [
    ['Account No.', 'Investor Name', 'Investment Option', 'Units', 'Unit Price', 'Option Value'],
    ['099900001', 'Sample, Alex', 'Example Growth Fund', 1000, 2, 3000],
    ['', '', 'Example Cash Fund', 1000, 1, ''],
  ];
  const header = detectHeader(SHEET);
  const [acc] = buildAccounts(SHEET, header.map, header.index).accounts;

  it('counts derived holding values in the account balance', () => {
    expect(acc.holdings.find((h) => h.option_name === 'Example Cash Fund').balance).toBe(1000);
    expect(acc.balance).toBe(4000);
  });

  it('gives derived holdings a real allocation, not 0%', () => {
    expect(acc.holdings.find((h) => h.option_name === 'Example Cash Fund').allocation_pct).toBe(25);
    expect(acc.holdings.find((h) => h.option_name === 'Example Growth Fund').allocation_pct).toBe(75);
  });
});
