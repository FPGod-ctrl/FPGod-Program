import { query } from '../config/db.js';
import { completeOrStub } from './openai.js';

/** Fetch a handful of historical plans to use as few-shot strategy examples. */
async function trainingExamples(limit = 4) {
  const { rows } = await query(
    `SELECT title, content FROM training_data
     WHERE kind = 'plan' ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

/** Assemble the full client context (profile, group, investments) for a plan. */
export async function gatherClientContext(clientId) {
  const { rows: [client] } = await query('SELECT * FROM clients WHERE id = $1', [clientId]);
  if (!client) return null;

  const [group, current, recommended] = await Promise.all([
    client.group_id
      ? query('SELECT * FROM client_groups WHERE id = $1', [client.group_id]).then((r) => r.rows[0])
      : null,
    query('SELECT * FROM current_investments WHERE client_id = $1', [clientId]).then((r) => r.rows),
    query('SELECT * FROM recommended_investments WHERE client_id = $1', [clientId]).then((r) => r.rows),
  ]);

  return { client, group, current, recommended };
}

function contextToText(ctx) {
  const { client, group, current, recommended } = ctx;
  const lines = [];
  lines.push(`Client: ${client.first_name} ${client.last_name}`);
  if (client.occupation) lines.push(`Occupation: ${client.occupation}`);
  if (client.date_of_birth) lines.push(`DOB: ${client.date_of_birth}`);
  if (client.risk_profile) lines.push(`Risk profile: ${client.risk_profile}`);
  if (client.annual_income) lines.push(`Annual income: ${client.annual_income}`);
  if (client.net_worth) lines.push(`Net worth: ${client.net_worth}`);
  if (group) lines.push(`Household: ${group.name} (${group.group_type})`);
  if (current.length) {
    lines.push('\nCurrent investments:');
    current.forEach((i) =>
      lines.push(`- ${i.fund_name} | ${i.account_type || ''} | $${i.balance} | ${i.allocation_pct ?? '?'}% | risk ${i.risk_profile || '?'} | fee ${i.fee_pct ?? '?'}%`)
    );
  }
  if (recommended.length) {
    lines.push('\nRecommended investments:');
    recommended.forEach((i) =>
      lines.push(`- ${i.fund_name} | target $${i.target_amount ?? '?'} | ${i.allocation_pct ?? '?'}% | ${i.rationale || ''}`)
    );
  }
  return lines.join('\n');
}

const SYSTEM_PROMPT =
  'You are a senior financial planner. Produce a clear, professional, ~95% complete ' +
  'financial plan in Markdown. Include: Executive Summary, Goals & Objectives, Current ' +
  'Position, Risk Assessment, Recommendations (with specific, actionable steps), an ' +
  'Investment Strategy referencing the holdings, and Next Steps. Leave clearly-marked ' +
  '[ADVISOR TO CONFIRM] placeholders only where personal judgement is genuinely required.';

/**
 * Generate a financial plan from client context + historical examples.
 * @param {object} ctx  result of gatherClientContext
 * @param {string} [instructions] extra advisor instructions
 * @returns {Promise<{ content: string, ai: boolean }>}
 */
export async function generatePlan(ctx, instructions = '') {
  const examples = await trainingExamples();
  const exampleBlock = examples
    .map((e, i) => `Example ${i + 1} (${e.title}):\n${e.content}`)
    .join('\n\n');

  const userContent =
    `Use these historical plans as style/strategy references:\n${exampleBlock}\n\n` +
    `Now write a plan for this client:\n${contextToText(ctx)}` +
    (instructions ? `\n\nAdditional advisor instructions: ${instructions}` : '');

  const stub = () => buildStubPlan(ctx);

  return completeOrStub(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.5,
      maxTokens: 1800,
    },
    stub
  );
}

function buildStubPlan(ctx) {
  const { client, current } = ctx;
  const totalBalance = current.reduce((s, i) => s + Number(i.balance || 0), 0);
  return `# Financial Plan — ${client.first_name} ${client.last_name}

> _Generated in offline stub mode (no OpenAI key configured). Set OPENAI_API_KEY for full AI generation._

## Executive Summary
This plan outlines a ${client.risk_profile || 'balanced'} strategy for ${client.first_name} ${client.last_name}, currently holding approximately $${totalBalance.toLocaleString()} across ${current.length} positions.

## Goals & Objectives
- [ADVISOR TO CONFIRM] Primary financial goals and target retirement age.
- Establish an appropriate emergency reserve.
- Optimise asset allocation to the stated risk profile.

## Current Position
${current.map((i) => `- ${i.fund_name}: $${Number(i.balance).toLocaleString()} (${i.allocation_pct ?? '?'}%)`).join('\n') || '- No holdings on file yet.'}

## Risk Assessment
Risk profile on file: **${client.risk_profile || 'not set'}**. [ADVISOR TO CONFIRM] capacity vs. tolerance.

## Recommendations
1. Rebalance toward the target allocation for a ${client.risk_profile || 'balanced'} investor.
2. Reduce blended fees by consolidating into managed model portfolios.
3. Review tax-advantaged contribution capacity.

## Investment Strategy
Transition current holdings into a diversified model aligned to the risk profile, prioritising fee efficiency and tax placement.

## Next Steps
- [ADVISOR TO CONFIRM] Schedule implementation meeting.
- Approve recommended fund switches.
`;
}

export default { generatePlan, gatherClientContext };
