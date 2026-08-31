import { describe, it, expect } from 'vitest';
import { RISK_GUARDRAILS, DEFAULT_SECTIONS } from '../services/riskSoaGenerator.js';

/**
 * The guardrails are a prompt string, so nothing but a test stops a rule being
 * dropped by an unrelated edit. Each rule below exists because getting it wrong
 * produces advice that reads as correct but is not compliant — the failure mode
 * is silent, which is exactly what makes it worth pinning.
 */
describe('risk SOA guardrails', () => {
  const has = (re) => expect(RISK_GUARDRAILS).toMatch(re);

  it('forbids stating premiums that were not supplied', () => {
    has(/NEVER state a premium/i);
    has(/\[ADVISOR TO CONFIRM\]/);
  });

  it('requires the needs analysis to add up', () => {
    has(/MUST sum to the stated recommendation/i);
  });

  it('keeps trauma cover outside superannuation', () => {
    // Trauma fails the SIS conditions of release; recommending it inside super
    // is a straightforward compliance error.
    has(/Trauma[^\n]*CANNOT be held inside superannuation/i);
  });

  it('keeps own-occupation TPD outside super for post-2014 policies', () => {
    has(/own occupation.{0,120}1 July 2014/is);
  });

  it('carries the do-not-cancel warning for replacement of cover', () => {
    has(/must NOT cancel the existing policy until the new cover is confirmed in force/i);
  });

  it('uses the current duty, not the superseded duty of disclosure', () => {
    has(/duty to take reasonable care not to make a misrepresentation/i);
    has(/5 October 2021/);
    // The old wording may only appear as the thing being ruled out.
    expect(RISK_GUARDRAILS).toMatch(/NOT the superseded "duty of disclosure" wording/i);
  });

  it('names the advising firm and forbids reusing another licensee', () => {
    // Reference material carries the previous practice's letterhead and AFSL.
    // Copying it would issue advice under another licensee.
    has(/FIRM IDENTITY/);
    has(/NEVER reproduce another firm's name, licensee, AR number, AFSL/i);
    has(/another licensee's AFSL is a compliance breach/i);
  });

  it('forbids carrying client details across from reference material', () => {
    has(/Never carry a client name, figure, policy or personal detail/i);
  });

  it('rules out US terminology', () => {
    has(/NEVER use US concepts/i);
  });
});

describe('default risk SOA sections', () => {
  it('covers the sections a risk SOA cannot ship without', () => {
    const titles = DEFAULT_SECTIONS.map((s) => s.title.toLowerCase()).join(' | ');
    for (const required of [
      'scope', 'about you', 'existing insurance', 'how much cover you need',
      'recommendations', 'why i am recommending', 'ownership', 'replacing',
      'cost', 'risks', 'fees, commissions', 'next steps',
    ]) {
      expect(titles).toContain(required);
    }
  });

  it('numbers every section exactly once, in order', () => {
    const numbers = DEFAULT_SECTIONS.map((s) => Number(s.title.match(/^(\d+)\./)?.[1]));
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it('gives every section a brief for the model to work from', () => {
    for (const s of DEFAULT_SECTIONS) {
      expect(s.brief, `${s.title} has no brief`).toBeTruthy();
      expect(s.brief.length).toBeGreaterThan(80);
    }
  });
});
