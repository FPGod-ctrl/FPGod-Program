import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { RISK_GUARDRAILS } from '../services/riskSoaGenerator.js';
import {
  LEGACY_SECTIONS, HOUSE_WORDING, houseWordingFor, resolveWordingRef, PLACEHOLDER,
  REPLACEMENT_WORDING, INA_NOT_DONE_WORDING,
} from '../services/legacySoaStructure.js';
import { env } from '../config/env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES = ['../services/riskSoaGenerator.js', '../services/legacySoaStructure.js']
  .map((f) => readFileSync(resolve(__dirname, f), 'utf8'));
const section = (title) => LEGACY_SECTIONS.find((s) => s.title === title);

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
    has(/\[ADVISER TO CONFIRM\]/);
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

  it('reads the adviser AR number from ADVISER_AR, else leaves a placeholder', () => {
    // It must never fall back to another adviser's, which is exactly what
    // copying an example would produce.
    has(/Authorised Representative No\. (\d+|\[ADVISER TO CONFIRM\])/);
    if (env.adviser.ar) {
      expect(RISK_GUARDRAILS).toContain(`Authorised Representative No. ${env.adviser.ar}`);
    } else {
      expect(RISK_GUARDRAILS).toContain('Authorised Representative No. [ADVISER TO CONFIRM]');
    }
  });
});

describe('needs analysis position', () => {
  // House practice (build-soa Q-SOA-1 default): the adviser is asked whether an
  // INA was done. No -> client-directed wording + Incomplete INA warning.
  // Yes -> reasons in prose. Silent -> a placeholder asking the question.
  it('branches on whether the adviser notes say an INA was done', () => {
    expect(RISK_GUARDRAILS).toMatch(/If they say NO INA was done[^\n]*client-directed wording and the Incomplete INA warning/i);
    expect(RISK_GUARDRAILS).toMatch(/If they say an INA WAS done, give the REASONS for each recommended sum insured in prose/i);
    expect(RISK_GUARDRAILS).toMatch(/If the notes are silent[^\n]*\[ADVISER TO CONFIRM\] Was a full Insurance Needs Analysis done/i);
  });

  it('no longer asserts that every client has a background needs analysis', () => {
    expect(RISK_GUARDRAILS).not.toMatch(/a full needs analysis is completed for every client/i);
    expect(RISK_GUARDRAILS).not.toMatch(/NEVER state or imply that a needs analysis was declined/i);
  });

  it('sends the client-directed INA wording only as a conditional group', () => {
    expect(section('Insurance recommendations').conditionalWording).toContain(INA_NOT_DONE_WORDING);
    const refs = INA_NOT_DONE_WORDING.blocks.map((b) => b.ref);
    expect(refs).toEqual(['objectives.2', 'needs-analysis-position.1', 'needs-analysis-position.2']);
    expect(INA_NOT_DONE_WORDING.when).toMatch(/ONLY where the adviser notes say NO full Insurance Needs Analysis/);
    expect(INA_NOT_DONE_WORDING.when).toMatch(/OMIT EVERY BLOCK/);
    // Never always-on: no section lists the INA blocks in its plain wording.
    const always = LEGACY_SECTIONS.flatMap((s) => s.wording || []);
    for (const r of [...refs, 'needs-analysis-position', 'objectives']) expect(always).not.toContain(r);
  });

  it('briefs the recommendations section on all three INA answers', () => {
    const { brief } = section('Insurance recommendations');
    expect(brief).toMatch(/Notes say NO INA was done/);
    expect(brief).toMatch(/Notes say an INA WAS done: give the REASONS/);
    expect(brief).toMatch(/Notes are silent: write "\[ADVISER TO CONFIRM\] Was a full Insurance Needs Analysis done/);
  });
});

describe('replacement wording', () => {
  const rec = section('Insurance recommendations');

  it('is conditional on replacing, cancelling or reducing cover, never always-on', () => {
    expect(rec.wording).not.toContain('replacement');
    expect(rec.conditionalWording).toContain(REPLACEMENT_WORDING);
    expect(REPLACEMENT_WORDING.when).toMatch(/ONLY where a recommendation replaces, cancels or reduces existing cover/);
    expect(REPLACEMENT_WORDING.when).toMatch(/OMIT EVERY BLOCK IN THIS GROUP for brand-new cover/);
    expect(REPLACEMENT_WORDING.blocks.map((b) => b.ref))
      .toEqual(['replacement.1', 'replacement.2', 'replacement.4', 'replacement.5']);
    expect(REPLACEMENT_WORDING.blocks[0].note).toMatch(/Life cover replaces existing Life/);
  });

  it('puts the clawback lead-in with the Fees clawback rates', () => {
    const fees = section('Fees and disclosures');
    expect(fees.wording).toContain('replacement.3');
    expect(fees.brief).toMatch(/clawback lead-in.*immediately followed by the clawback rate table.*100%.*60%/);
    const all = LEGACY_SECTIONS.flatMap((s) => [...(s.wording || []),
      ...(s.conditionalWording || []).flatMap((g) => g.blocks.map((b) => b.ref))]);
    expect(all.filter((r) => r === 'replacement.3' || r === 'replacement')).toEqual(['replacement.3']);
  });

  it('puts about.5 in Alternatives and objectives.3 at the recommendations opening', () => {
    expect(section('About this document').wording).not.toContain('about');
    expect(section('About this document').wording).not.toContain('about.5');
    expect(section('Alternatives').wording).toEqual(['about.5']);
    expect(section('Your objectives').wording).toEqual(['objectives.1']);
    expect(rec.wording[0]).toBe('objectives.3');
    expect(resolveWordingRef('about.5')[0]).toMatch(/^In order to determine the recommendations/);
    expect(resolveWordingRef('objectives.3')[0]).toMatch(/^This section details our recommendations/);
    expect(resolveWordingRef('replacement.3')[0]).toMatch(/^Therefore, if you replace, cancel or reduce/);
  });

  it('limits replacement-only warnings to replacements in the guardrails', () => {
    expect(RISK_GUARDRAILS).toMatch(/Replacement-only warnings[^\n]*ONLY where existing cover is replaced, cancelled or reduced[^\n]*never on brand-new cover/);
  });
});

describe('placeholder spelling (Q-SH-3)', () => {
  it('uses [ADVISER TO CONFIRM] only, in the generator, structure and stub', () => {
    expect(PLACEHOLDER).toBe('[ADVISER TO CONFIRM]');
    for (const src of SOURCES) expect(src).not.toMatch(/ADVISOR TO CONFIRM/);
    expect(RISK_GUARDRAILS).not.toMatch(/ADVISOR/);
    for (const s of LEGACY_SECTIONS) expect(s.brief).not.toMatch(/ADVISOR/);
  });

  it('is matched by the SOA Notes builder highlight regex', () => {
    const py = readFileSync(resolve(__dirname, '../../scripts/build_soa_notes.py'), 'utf8');
    const m = /FLAG = re\.compile\(r'([^']+)'\)/.exec(py);
    expect(m, 'FLAG regex not found in build_soa_notes.py').toBeTruthy();
    const flag = new RegExp(m[1]);
    expect(flag.test(PLACEHOLDER)).toBe(true);
    expect(flag.test('[ADVISER TO CONFIRM] Was a full Insurance Needs Analysis done for this client?')).toBe(true);
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

  it('resolves every house-wording reference it uses', () => {
    for (const s of LEGACY_SECTIONS) {
      const refs = [...(s.wording || []),
        ...(s.conditionalWording || []).flatMap((g) => g.blocks.map((b) => b.ref))];
      for (const ref of refs) {
        expect(resolveWordingRef(ref).length, `${s.title} references missing wording "${ref}"`)
          .toBeGreaterThan(0);
      }
    }
    expect(resolveWordingRef('about.99')).toEqual([]);
    expect(houseWordingFor(['about']).length).toBe(HOUSE_WORDING.sections.about.length);
  });

  it('supplies verbatim wording to the sections that carry compliance language', () => {
    for (const title of ['Important information', 'Fees and disclosures', 'About this document']) {
      expect(houseWordingFor(section(title).wording).length, `${title} has no house wording`)
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
