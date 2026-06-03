import { marked } from 'marked';

// Font stacks per theme. Kept in sync with the frontend's plan themes.
const FONTS = {
  modern: { heading: 'Helvetica, Arial, sans-serif', body: 'Helvetica, Arial, sans-serif' },
  classic: { heading: 'Georgia, "Times New Roman", serif', body: 'Georgia, "Times New Roman", serif' },
  minimal: { heading: 'Arial, Helvetica, sans-serif', body: 'Arial, Helvetica, sans-serif' },
};

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
 */
export function renderPlanHtml({ plan, client, theme = 'modern', accent = '#0ea5a4', firmName = '', tagline = '' }) {
  const fonts = FONTS[theme] || FONTS.modern;
  const body = styleHeadings(marked.parse(plan.content || '_No content._'), accent, fonts);
  const clientName = client ? `${client.first_name} ${client.last_name}` : '';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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

export default { renderPlanHtml };
