import { describe, it, expect } from 'vitest';
import { practice, referralPartnerFor, tierForPremium, advisers } from '../services/crm/practice.js';

describe('Legacy practice settings', () => {
  it('loads the team, tiers, referral partners, insurers and threads', () => {
    expect(practice.tiers.map((t) => t.key)).toEqual(['platinum', 'gold', 'silver', 'bronze']);
    expect(practice.threads).toContain('Declined CPI');
    expect(practice.insurers).toContain('TAL');
    expect(advisers()).toContain('Josh Davidson');
    expect(advisers()).not.toContain('Enis Vural');
  });
});

describe('tierForPremium', () => {
  it('follows the client classification bands', () => {
    expect(tierForPremium(30000)).toBe('platinum');
    expect(tierForPremium(25000)).toBe('platinum');
    expect(tierForPremium(20000)).toBe('gold');
    expect(tierForPremium(6000)).toBe('silver');
    expect(tierForPremium(1200)).toBe('bronze');
  });

  it('gives no tier without a premium', () => {
    expect(tierForPremium(null)).toBeNull();
    expect(tierForPremium(0)).toBeNull();
  });
});

describe('referralPartnerFor', () => {
  it('recognises a referral partner by short or legal name', () => {
    expect(referralPartnerFor('PPA')?.legalName).toBe('Performance Property Pty Ltd');
    expect(referralPartnerFor('Performance Property Pty Ltd')?.name).toBe('PPA (Performance Property)');
    expect(referralPartnerFor('the hope fund')?.fee).toMatch(/excluding GST/);
  });

  it('does not flag a source with no fee arrangement', () => {
    expect(referralPartnerFor('Allfin')).toBeNull();
    expect(referralPartnerFor('Website enquiry')).toBeNull();
    expect(referralPartnerFor('a')).toBeNull();
    expect(referralPartnerFor('')).toBeNull();
  });
});
