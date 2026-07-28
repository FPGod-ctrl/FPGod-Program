import { describe, it, expect } from 'vitest';
import {
  ageAt, bandFor, personKey, personKeys, groupByPerson, selectTargets, segmentByAge,
} from '../services/cfsCampaign.js';

const AS_AT = new Date('2026-07-26T00:00:00');

const rows = [
  // One member, three accounts — must collapse to a single call.
  { id: 'a1', account_name: 'Mr Multi Member', product: 'FirstChoice Wholesale Personal Super',
    balance: 300000, fee_status: 'not_paying', date_of_birth: '1966-01-10',
    email: 'multi@example.com', growth_pct: 80, as_at_date: '2026-06-30' },
  { id: 'a2', account_name: 'Mr Multi Member', product: 'FirstChoice Wholesale Allocated Pension',
    balance: 100000, fee_status: 'not_paying', date_of_birth: '1966-01-10',
    email: null, growth_pct: 40, as_at_date: '2026-06-30' },
  { id: 'a3', account_name: 'Mr Multi Member', product: 'FirstChoice Wholesale Term Allocated Pension',
    balance: 100000, fee_status: 'paying', adviser_fee_amount: 500,
    date_of_birth: '1966-01-10', growth_pct: 0, as_at_date: '2026-06-30' },

  { id: 'b1', account_name: 'Mrs Jane Sample', product: 'FirstChoice Employer Super',
    balance: 80000, fee_status: 'not_paying', date_of_birth: '1996-05-05',
    email: 'jane@example.com', growth_pct: 100, as_at_date: '2026-06-30' },

  { id: 'c1', account_name: 'Mr No Birthday', product: 'FirstChoice Wholesale Investments',
    balance: 900000, fee_status: 'not_paying', date_of_birth: null,
    email: null, growth_pct: null, as_at_date: '2026-06-30' },

  { id: 'd1', account_name: 'Bobear Super Pty Ltd', product: 'FirstChoice Wholesale Investments',
    balance: 500000, fee_status: 'not_paying', date_of_birth: null, as_at_date: '2026-06-30' },
];

// Mirrors the generator's output convention, including the "_Fund" entity marker.
const drafts = new Map([
  ['jane|sample', { file: 'Sample_Jane.md', name: 'Jane Sample' }],
  ['entity:bobear super pty ltd', { file: 'Bobear Super Pty Ltd_Fund.md', name: 'Bobear Super Pty Ltd' }],
]);

describe('ageAt', () => {
  it('counts whole years', () => {
    expect(ageAt('1966-01-10', AS_AT)).toBe(60);
    expect(ageAt('1996-05-05', AS_AT)).toBe(30);
  });

  it('does not count a birthday that has not happened yet', () => {
    expect(ageAt('1966-12-31', AS_AT)).toBe(59);
    expect(ageAt('1966-07-26', AS_AT)).toBe(60);   // birthday today
    expect(ageAt('1966-07-27', AS_AT)).toBe(59);   // tomorrow
  });

  it('returns null for a missing or unusable date', () => {
    expect(ageAt(null)).toBeNull();
    expect(ageAt('not a date')).toBeNull();
  });
});

describe('bandFor', () => {
  it('bands on the ages that change the advice', () => {
    expect(bandFor(39)).toBe('under_40');
    expect(bandFor(54)).toBe('40_54');
    expect(bandFor(55)).toBe('55_59');
    expect(bandFor(60)).toBe('60_64');
    expect(bandFor(69)).toBe('65_69');
    expect(bandFor(70)).toBe('70_plus');
    expect(bandFor(null)).toBe('unknown');
  });
});

describe('personKeys', () => {
  it('offers an initial-only key so abbreviated joint names still match', () => {
    const keys = personKeys('Mrs R Jing & Mr C Poon');
    expect(keys).toContain('r|jing');
    expect(personKeys('Rongsheng Jing')).toContain('r|jing');
  });

  it('keys entities on their whole name', () => {
    expect(personKey('Bobear Super Pty Ltd')).toBe('entity:bobear super pty ltd');
  });

  it('ignores titles', () => {
    expect(personKeys('Mrs Jane Sample')).toContain('jane|sample');
  });
});

describe('groupByPerson', () => {
  const people = groupByPerson(rows, { asAt: AS_AT, drafts });

  it('collapses a member\'s accounts into one person', () => {
    expect(people).toHaveLength(4);
    const multi = people.find((p) => p.name === 'Mr Multi Member');
    expect(multi.accounts).toBe(3);
    expect(multi.balance).toBe(500000);
    expect(multi.products).toHaveLength(3);
  });

  it('treats a person paying on any account as paying', () => {
    expect(people.find((p) => p.name === 'Mr Multi Member').fee_status).toBe('paying');
    expect(people.find((p) => p.name === 'Mrs Jane Sample').fee_status).toBe('not_paying');
  });

  it('weights the growth split by balance, not by account count', () => {
    // (300k*80 + 100k*40 + 100k*0) / 500k = 56
    expect(people.find((p) => p.name === 'Mr Multi Member').growth_pct).toBe(56);
  });

  it('keeps the first email found across the accounts', () => {
    expect(people.find((p) => p.name === 'Mr Multi Member').email).toBe('multi@example.com');
    expect(people.find((p) => p.name === 'Mr No Birthday').email).toBeNull();
  });

  it('ages and bands each person', () => {
    expect(people.find((p) => p.name === 'Mrs Jane Sample')).toMatchObject({ age: 30, age_band: 'under_40' });
    expect(people.find((p) => p.name === 'Mr No Birthday')).toMatchObject({ age: null, age_band: 'unknown' });
  });

  it('flags people who already have a draft, including entities', () => {
    expect(people.find((p) => p.name === 'Mrs Jane Sample').drafted).toBe(true);
    expect(people.find((p) => p.name === 'Bobear Super Pty Ltd').drafted).toBe(true);
    expect(people.find((p) => p.name === 'Mr Multi Member').drafted).toBe(false);
  });
});

describe('selectTargets', () => {
  const people = groupByPerson(rows, { asAt: AS_AT, drafts });

  it('ranks the biggest relationships first', () => {
    const { targets } = selectTargets(people, {});
    expect(targets[0].name).toBe('Mr No Birthday');
    expect(targets.map((t) => t.balance)).toEqual([900000, 500000, 500000, 80000]);
  });

  it('filters on balance and reports what it dropped', () => {
    const { targets, excluded } = selectTargets(people, { minBalance: 100000 });
    expect(targets).toHaveLength(3);
    expect(excluded.balance).toBe(1);
  });

  it('keeps people whose age is unknown rather than silently dropping them', () => {
    // A $900k account with no readable date of birth must not vanish from a
    // campaign just because an age filter was applied.
    const { targets } = selectTargets(people, { minAge: 55, maxAge: 70 });
    expect(targets.map((t) => t.name)).toContain('Mr No Birthday');
    expect(targets.map((t) => t.name)).not.toContain('Mrs Jane Sample');
  });

  it('can exclude entities and the already-drafted', () => {
    const { targets, excluded } = selectTargets(people, { includeEntities: false, includeDrafted: false });
    expect(targets.map((t) => t.name)).toEqual(['Mr No Birthday', 'Mr Multi Member']);
    expect(excluded.entity).toBe(1);
    expect(excluded.drafted).toBe(1);
  });
});

describe('segmentByAge', () => {
  const people = groupByPerson(rows, { asAt: AS_AT, drafts });
  const segments = segmentByAge(people);

  it('reports people, balance and draft coverage per band', () => {
    const unknown = segments.find((s) => s.key === 'unknown');
    expect(unknown.people).toBe(2);            // no-birthday person + the entity
    expect(unknown.balance).toBe(1400000);
    expect(unknown.drafted).toBe(1);
  });

  it('omits empty bands', () => {
    expect(segments.find((s) => s.key === '65_69')).toBeUndefined();
    expect(segments.every((s) => s.people > 0)).toBe(true);
  });
});
