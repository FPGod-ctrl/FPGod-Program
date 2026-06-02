import { query } from '../config/db.js';
import { completeOrStub } from './openai.js';

/** Historical follow-up emails used as tone/format references. */
async function emailExamples(limit = 3) {
  const { rows } = await query(
    `SELECT title, content FROM training_data
     WHERE kind = 'email' ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

const SYSTEM_PROMPT =
  'You are a financial advisor writing a follow-up email after a client meeting. ' +
  'Match the warm-but-professional tone of the provided historical examples. ' +
  'Summarise what was discussed, confirm agreed next steps with owners, and keep it ' +
  'concise. Return the email body only (no subject line, no markdown headings).';

/**
 * Generate a follow-up email from a transcript.
 * @param {{ transcript: object, client?: object }} input
 * @param {string} [instructions]
 * @returns {Promise<{ subject: string, body: string, ai: boolean }>}
 */
export async function generateEmail({ transcript, client }, instructions = '') {
  const examples = await emailExamples();
  const exampleBlock = examples.map((e, i) => `Example ${i + 1}:\n${e.content}`).join('\n\n');
  const name = client ? `${client.first_name} ${client.last_name}` : 'the client';

  const userContent =
    `Historical follow-up email examples (for tone & structure):\n${exampleBlock}\n\n` +
    `Meeting transcript with ${name}:\n${transcript.content}` +
    (transcript.summary ? `\n\nMeeting summary: ${transcript.summary}` : '') +
    (instructions ? `\n\nAdditional instructions: ${instructions}` : '');

  const subject = `Following up on ${transcript.title || 'our meeting'}`;
  const stub = () => buildStubEmail(transcript, client);

  const { text, ai } = await completeOrStub(
    {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.6,
      maxTokens: 700,
    },
    stub
  );

  return { subject, body: text, ai };
}

function buildStubEmail(transcript, client) {
  const greeting = client ? `Hi ${client.first_name},` : 'Hello,';
  return `${greeting}

Thank you for taking the time to meet${transcript.title ? ` regarding "${transcript.title}"` : ''}.

[Offline stub — set OPENAI_API_KEY for AI-written emails.]

A quick recap of what we discussed${transcript.summary ? `: ${transcript.summary}` : '.'}

Next steps:
- [ADVISOR TO CONFIRM] action items from the meeting.

I'll follow up with the paperwork shortly. Please reach out with any questions.

Best regards,
Your Advisor`;
}

export default { generateEmail };
