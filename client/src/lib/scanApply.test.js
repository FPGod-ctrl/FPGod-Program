import { describe, it, expect } from 'vitest';
import { CATS, RISK_ENUM, coerceEnum, prepareItem, sanitize, sanitizeClient } from './scanApply.js';

const cat = (key) => CATS.find((c) => c.key === key);
const prep = (key, raw) => prepareItem(raw, cat(key), 'client-1');

describe('sanitize', () => {
  it('nulls placeholder text instead of writing it to the database', () => {
    expect(sanitize({ occupation: 'Not provided' }).occupation).toBeNull();
    expect(sanitize({ occupation: 'N/A' }).occupation).toBeNull();
    expect(sanitize({ occupation: 'Engineer' }).occupation).toBe('Engineer');
  });

  it('strips currency formatting from numeric columns', () => {
    expect(sanitize({ balance: '$1,250,000.50' }).balance).toBe(1250000.5);
    expect(sanitize({ balance: 'about ten grand' }).balance).toBeNull();
  });

  it('rejects dates that are not real dates', () => {
    expect(sanitize({ date_of_birth: '1974-03-02T00:00:00Z' }).date_of_birth).toBe('1974-03-02');
    expect(sanitize({ date_of_birth: 'March 1974' }).date_of_birth).toBeNull();
  });

  it('reads yes/no answers into booleans', () => {
    expect(sanitize({ smoker: 'Non-smoker' }).smoker).toBe(false);
    expect(sanitize({ smoker: 'Yes' }).smoker).toBe(true);
    expect(sanitize({ smoker: 'occasionally' }).smoker).toBeNull();
    expect(sanitize({ has_will: true }).has_will).toBe(true);
  });
});

describe('sanitizeClient', () => {
  it('maps loose risk wording onto the allowed values', () => {
    expect(sanitizeClient({ risk_profile: 'High Growth' }).risk_profile).toBe('aggressive');
    expect(sanitizeClient({ risk_profile: 'Defensive' }).risk_profile).toBe('conservative');
    expect(sanitizeClient({ risk_profile: 'balanced' }).risk_profile).toBe('balanced');
  });

  it('falls back to prospect for an unrecognised status', () => {
    expect(sanitizeClient({ status: 'New Lead' }).status).toBe('prospect');
  });
});

describe('prepareItem', () => {
  it('maps everyday wording onto constrained enum columns', () => {
    expect(prep('liabilities', { name: 'ANZ', liability_type: 'Home Loan' }).liability_type).toBe('mortgage');
    expect(prep('liabilities', { name: 'HECS', liability_type: 'HECS-HELP' }).liability_type).toBe('student_loan');
    expect(prep('income', { name: 'Job', income_type: 'Wages', frequency: 'per annum' }))
      .toMatchObject({ income_type: 'salary', frequency: 'annual' });
    expect(prep('insurance', { policy_type: 'Total and Permanent Disability' }).policy_type).toBe('tpd');
    expect(prep('assets', { name: 'Family home', category: 'Real Estate' }).category).toBe('property');
    expect(prep('family', { first_name: 'Ella', relationship: 'Daughter' }).relationship).toBe('child');
  });

  it('falls back to "other" rather than failing a row on an unknown enum', () => {
    expect(prep('liabilities', { name: 'Odd debt', liability_type: 'Zorblax loan' }).liability_type).toBe('other');
  });

  it('drops a nullable enum it cannot map, keeping the rest of the row', () => {
    const row = prep('income', { name: 'Rent', income_type: 'rental', frequency: 'whenever' });
    expect(row.frequency).toBeUndefined();
    expect(row.income_type).toBe('rental');
  });

  it('skips rows whose required field did not survive cleaning', () => {
    expect(prep('assets', { name: 'Not provided', value: 100 })).toBeNull();
    expect(prep('goals', { target_amount: 500 })).toBeNull();
  });

  it('defaults a missing policy type instead of dropping the policy', () => {
    expect(prep('insurance', { provider: 'AIA', cover_amount: '$500,000' }))
      .toMatchObject({ policy_type: 'other', cover_amount: 500000 });
  });

  it('stamps the client id onto every row', () => {
    expect(prep('goals', { name: 'Retire at 60' }).client_id).toBe('client-1');
  });
});

describe('form pre-fill enum snapping', () => {
  it('snaps scanned risk wording onto a real dropdown option', () => {
    // "High growth" must become "aggressive", or the <Select> renders blank and
    // the advisor cannot see what the scan detected.
    expect(coerceEnum('High growth', RISK_ENUM.allowed, '', RISK_ENUM.aliases)).toBe('aggressive');
    expect(coerceEnum('Balanced', RISK_ENUM.allowed, '', RISK_ENUM.aliases)).toBe('balanced');
    expect(coerceEnum('gibberish', RISK_ENUM.allowed, '', RISK_ENUM.aliases)).toBe('');
  });
});
