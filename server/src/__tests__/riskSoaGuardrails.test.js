import { describe, it, expect } from 'vitest';
import { RISK_GUARDRAILS } from '../services/riskSoaGenerator.js';
import { LEGACY_SECTIONS, HOUSE_WORDING, houseWordingFor } from '../services/legacySoaStructure.js';

/**
 * The guardrails and the house structure are prompt data, so nothing but a test
 * stops a rule being dropped by an unrelated edit. Each rule below exists
 * because getting it wrong produces advice that reads as correct but is not
 * compliant — the failure mode is silent, which is what makes it worth pinning.
 */
describe('risk SOA guardrails', () => {
  const has = (re) => expect(RISK_GUARDRAILS).toMatch(re);

  it('forbids stating premiums that were not supplied', () => {
    has(/NEVER state a premium/i);
    has(/\[ADVISOR TO CONFIRM\]/);
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
    expect(RISK_GUARDRAILS).toMatch(/NOT the superseded "duty of disclosure" wording/i);
  });

  it('rules out US terminology', () => {
    has(/NEVER use US concepts/i);
  });
});

describe('firm identity', () => {
  const has = (re) => expect(RISK_GUARDRAILS).toMatch(re);

  it('names the licensee and the firm separately', () => {
    // Legacy Risk Advice is a corporate Authorised Representative. The AFSL is
    // Synchron's. Attributing the AFSL to the firm would be wrong on every page.
    has(/Synchron Advice Pty Ltd/);
    has(/AFSL 243313/);
    has(/Legacy Risk Advice Pty Ltd/);
    has(/corporate Authorised Representative/i);
    has(/Never describe the firm as holding an AFSL/i);
  });

  it('forbids reusing another adviser or licensee', () => {
    has(/Never reproduce another adviser's name, AR number or contact details/i);
    has(/issuing advice under the wrong licensee is a compliance breach/i);
  });

  it('leaves an unknown adviser AR number as a placeholder', () => {
    // Tristan's own AR number is pending. It must never fall back to another
    // adviser's, which is exactly what copying an example would produce.
    has(/Authorised Representative No\. (\d+|\[ADVISOR TO CONFIRM\])/);
  });
});

describe('needs analysis position', () => {
  it('requires the analysis to be done but not printed as arithmetic', () => {
    // The 32 inherited SOAs all record that the client DECLINED a needs
    // analysis. That is not the standard this practice adopts: the analysis is
    // always done in the background and the SOA presents the reasoning.
    expect(RISK_GUARDRAILS).toMatch(/a full needs analysis is completed for every client/i);
    expect(RISK_GUARDRAILS).toMatch(/NEVER state or imply that a needs analysis was declined/i);
  });

  it('does not wire the inherited "declined" wording into any section', () => {
    const used = new Set(LEGACY_SECTIONS.flatMap((s) => s.wording || []));
    expect(used.has('needs-analysis-position')).toBe(false);
  });
});

describe('Legacy house structure', () => {
  it('matches the section order found in all 32 source documents', () => {
    expect(LEGACY_SECTIONS.map((s) => s.title)).toEqual([
      'About this document',
      'Executive summary',
      'Scope of our advice',
      'Your objectives',
      'Where you are now',
      'Insurance recommendations',
      'Alternatives',
      'Important information',
      'Fees and disclosures',
      'Actions required',
      'Authority to proceed',
      'Appendix: Insurance quotes',
    ]);
  });

  it('gives every section a brief substantial enough to write from', () => {
    for (const s of LEGACY_SECTIONS) {
      expect(s.brief, `${s.title} has no brief`).toBeTruthy();
      expect(s.brief.length, `${s.title} brief is too thin`).toBeGreaterThan(120);
    }
  });

  it('resolves every house-wording key it references', () => {
    for (const s of LEGACY_SECTIONS) {
      for (const key of s.wording || []) {
        expect(HOUSE_WORDING.sections[key], `${s.title} references missing key "${key}"`)
          .toBeTruthy();
      }
    }
  });

  it('supplies verbatim wording to the sections that carry compliance language', () => {
    for (const title of ['Important information', 'Fees and disclosures', 'About this document']) {
      const sec = LEGACY_SECTIONS.find((s) => s.title === title);
      expect(houseWordingFor(sec.wording).length, `${title} has no house wording`)
        .toBeGreaterThan(0);
    }
  });

  it('carries no template errors or client data in the house wording', () => {
    const all = Object.values(HOUSE_WORDING.sections).flat().map((b) => b.text).join('\n');
    expect(all).not.toMatch(/Err: Handling|include_schedules|Docnote:/);
    expect(all).not.toMatch(/Joshua Davidson|Luke Fisher/);
    expect(all).not.toMatch(/\$[\d,]+/);
  });
});
