import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Generator behaviour with the database and the model mocked out: no network,
 * no Postgres. The AI mock records each section prompt and can fail chosen
 * sections, so the fallback reporting and the prompt wiring can be pinned.
 */
const calls = [];
let failTitles = new Set();
let aiOn = true;

vi.mock('../config/db.js', () => ({ query: vi.fn(async () => ({ rows: [] })) }));
vi.mock('../services/planGenerator.js', () => ({
  contextToText: () => 'CLIENT: Test Person (fictional)',
  stripCodeFence: (s) => s,
}));
vi.mock('../services/ai.js', () => ({
  aiEnabled: () => aiOn,
  completeOrStub: vi.fn(async (opts, stub) => {
    const volatile = opts.messages[1].content[1].text;
    const title = /Now write the section "([^"]+)"/.exec(volatile)[1];
    calls.push({ title, volatile, system: opts.messages[0].content });
    if (failTitles.has(title)) return { text: stub(), ai: false };
    return { text: `## ${title}\n\nWritten.`, ai: true };
  }),
}));

const { generateRiskSoa } = await import('../services/riskSoaGenerator.js');
const { renderPlanHtml, formatAuDate } = await import('../services/planRender.js');

const ctx = { client: { first_name: 'Test', last_name: 'Person' } };
const promptFor = (title) => calls.find((c) => c.title === title).volatile;

beforeEach(() => {
  calls.length = 0;
  failTitles = new Set();
  aiOn = true;
});

describe('generateRiskSoa output', () => {
  it('writes one title block with an Australian date and returns the body separately', async () => {
    const gen = await generateRiskSoa(ctx, 'notes');
    expect(gen.date).toBe(formatAuDate());
    expect(gen.date).toMatch(/^\d{1,2} [A-Z][a-z]+ \d{4}$/); // "27 October 2026"
    expect(gen.title).toBe('Statement of Advice — Test Person');
    expect(gen.text.match(/^# /gm)).toHaveLength(1);
    expect(gen.text).toContain(`Prepared ${gen.date}`);
    expect(gen.body).not.toMatch(/^# /m);
    expect(gen.text.endsWith(gen.body)).toBe(true);
  });

  it('reports sections that fell back to the stub', async () => {
    failTitles = new Set(['Alternatives', 'Fees and disclosures']);
    const gen = await generateRiskSoa(ctx, 'notes');
    expect(gen.ai).toBe(true);
    expect(gen.failedSections).toEqual(['Alternatives', 'Fees and disclosures']);
    expect(gen.body).toContain('## Alternatives\n\n[ADVISER TO CONFIRM] This section could not be generated');
  });

  it('reports ai:false when every section failed', async () => {
    const { LEGACY_SECTIONS } = await import('../services/legacySoaStructure.js');
    failTitles = new Set(LEGACY_SECTIONS.map((s) => s.title));
    const gen = await generateRiskSoa(ctx, 'notes');
    expect(gen.ai).toBe(false);
    expect(gen.failedSections).toHaveLength(LEGACY_SECTIONS.length);
  });

  it('offline stub mode has one title, the [ADVISER TO CONFIRM] spelling and no failures', async () => {
    aiOn = false;
    const gen = await generateRiskSoa(ctx, '');
    expect(gen.ai).toBe(false);
    expect(gen.failedSections).toEqual([]);
    expect(gen.text.match(/^# /gm)).toHaveLength(1);
    expect(gen.body).toContain('[ADVISER TO CONFIRM]');
    expect(gen.text).not.toMatch(/ADVISOR/);
  });
});

describe('section prompts', () => {
  it('sends replacement warnings as a conditional group, never "do not omit"', async () => {
    await generateRiskSoa(ctx, 'notes');
    const rec = promptFor('Insurance recommendations');
    const [always, conditional] = rec.split('CONDITIONAL HOUSE WORDING');
    expect(conditional).toBeTruthy();
    // The suicide exclusion is only in the conditional part, with its condition.
    expect(always).not.toMatch(/13 months/);
    expect(rec).toMatch(/CONDITION: Include the blocks in this group ONLY where a recommendation replaces, cancels or reduces existing cover/);
    expect(rec).toMatch(/OMIT EVERY BLOCK IN THIS GROUP for brand-new cover/);
    expect(rec).toMatch(/\[Suicide exclusion: only where new Life cover replaces existing Life cover\.\] You will temporarily lose/);
    // Clawback lead-in is not in recommendations; it is in Fees.
    expect(rec).not.toMatch(/claws back from us/);
    expect(promptFor('Fees and disclosures')).toMatch(/claws back from us/);
  });

  it('sends the INA wording conditionally and places lead-ins where they belong', async () => {
    await generateRiskSoa(ctx, 'notes');
    const rec = promptFor('Insurance recommendations');
    expect(rec).toMatch(/ONLY where the adviser notes say NO full Insurance Needs Analysis/);
    expect(rec).toMatch(/\[Incomplete INA warning\.\] We have recommended that you complete a full insurance needs analysis/);
    expect(rec.split('CONDITIONAL HOUSE WORDING')[0]).toMatch(/This section details our recommendations/);
    expect(promptFor('Alternatives')).toMatch(/In order to determine the recommendations made in this Statement of Advice/);
    expect(promptFor('About this document')).not.toMatch(/we assessed various alternatives/);
    expect(promptFor('Your objectives')).not.toMatch(/This section details our recommendations|very clear about the level and types of cover/);
  });
});

describe('renderPlanHtml', () => {
  const plan = { title: 'Statement of Advice — Test Person', content: '# Statement of Advice — Test Person\n\n## About this document\n\nText.' };

  it('prints an en-AU date', () => {
    const html = renderPlanHtml({ plan: { title: 'Plan', content: 'x' } });
    expect(html).toContain(formatAuDate());
    expect(html).not.toMatch(/(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}/);
    expect(renderPlanHtml({ plan: { title: 'Plan', content: 'x' }, date: '1 July 2026' })).toContain('1 July 2026');
  });

  it('does not print the title twice when the content repeats it as an H1', () => {
    const html = renderPlanHtml({ plan });
    expect(html.split('Statement of Advice — Test Person')).toHaveLength(2);
    expect(html).toContain('About this document');
  });

  it('keeps an H1 that is not the title', () => {
    const html = renderPlanHtml({ plan: { title: 'Financial Plan', content: '# Executive summary\n\nText.' } });
    expect(html).toMatch(/<h1[^>]*>Executive summary<\/h1>/);
  });
});
