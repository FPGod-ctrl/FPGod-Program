import { marked } from 'marked';

// Font stacks per theme. Kept in sync with the frontend's plan themes.
const FONTS = {
  modern: { heading: 'Helvetica, Arial, sans-serif', body: 'Helvetica, Arial, sans-serif' },
  classic: { heading: 'Georgia, "Times New Roman", serif', body: 'Georgia, "Times New Roman", serif' },
  minimal: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
};

/**
 * The practice is Australian: every date in a generated document is en-AU
 * ("27 October 2026"), never US order. One formatter so the Word header and the
 * document body cannot disagree.
 */
export function formatAuDate(d = new Date()) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Drop a leading Markdown H1 that repeats the header title exactly. Saved risk
 * SOAs carry their own "# Statement of Advice — …" line; the header prints the
 * same title, so without this the Word document shows it twice.
 */
function dropDuplicateTitle(md, title) {
  if (!title) return md;
  const m = /^\s*#[ \t]+(.+?)[ \t]*(?:\r?\n|$)/.exec(md);
  return m && m[1].trim() === String(title).trim() ? md.slice(m[0].length) : md;
}

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Apply inline theme styles to heading tags so Word/exports render on-brand. */
function styleHeadings(html, accent, fonts) {
  return html
    .replace(/<h1>/g, `<h1 style="font-family:${fonts.heading};color:${accent};font-size:22px;border-bottom:1px solid #dddddd;padding-bottom:6px;margin-top:18px;">`)
    .replace(/<h2>/g, `<h2 style="font-family:${fonts.heading};color:${accent};font-size:17px;margin-top:16px;">`)
    .replace(/<h3>/g, `<h3 style="font-family:${fonts.heading};color:#333333;font-size:14px;margin-top:12px;">`);
}

/**
 * Render a plan to a self-contained, inline-styled HTML document suitable for
 * conversion to DOCX (Word honours inline styles, not external CSS).
 *
 * @param {object} args
 * @param {object} args.plan
 * @param {object} [args.client]
 * @param {string} [args.theme]    'modern' | 'classic' | 'minimal'
 * @param {string} [args.accent]   hex colour
 * @param {string} [args.firmName]
 * @param {string} [args.tagline]
 * @param {string} [args.date]     preparation date to print; defaults to today (en-AU)
 *
 * This header is the document's ONLY title block: pass content that does not
 * open with its own title (e.g. riskSoaGenerator's `body`), or the title prints twice.
 */
export function renderPlanHtml({ plan, client, theme = 'modern', accent = '#0ea5a4', firmName = '', tagline = '', date }) {
  const fonts = FONTS[theme] || FONTS.modern;
  const content = dropDuplicateTitle(plan.content || '', plan.title);
  const body = styleHeadings(marked.parse(content.trim() ? content : '_No content._'), accent, fonts);
  const clientName = client ? `${client.first_name} ${client.last_name}` : '';
  const dateStr = date || formatAuDate();

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:${fonts.body};color:#1a1a1a;font-size:12px;line-height:1.5;">
  <div style="border-bottom:3px solid ${accent};padding-bottom:14px;margin-bottom:22px;">
    ${firmName ? `<div style="font-size:18px;font-weight:bold;color:${accent};font-family:${fonts.heading};">${esc(firmName)}</div>` : ''}
    ${tagline ? `<div style="font-size:10px;color:#666666;">${esc(tagline)}</div>` : ''}
    <div style="font-size:26px;font-weight:bold;margin-top:12px;font-family:${fonts.heading};">${esc(plan.title || 'Financial Plan')}</div>
    <div style="font-size:12px;color:#555555;margin-top:6px;">${clientName ? `Prepared for ${esc(clientName)} &middot; ` : ''}${dateStr}</div>
  </div>
  <div>${body}</div>
</body></html>`;
}

export default { renderPlanHtml, formatAuDate };
