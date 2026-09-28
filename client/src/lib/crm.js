import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

/**
 * Shared bits for the CRM pages: how each kind of contact is shown, stage
 * colours, and dates the way an Australian practice reads them.
 */

export const KIND_META = {
  call: { icon: '📞', label: 'Call', plural: 'Calls' },
  email: { icon: '✉️', label: 'Email', plural: 'Emails' },
  meeting: { icon: '🤝', label: 'Meeting', plural: 'Meetings' },
  sms: { icon: '💬', label: 'Text', plural: 'Texts' },
  letter: { icon: '📄', label: 'Letter', plural: 'Letters' },
  note: { icon: '📝', label: 'Note', plural: 'Notes' },
  stage: { icon: '➜', label: 'Stage', plural: 'Stage changes' },
};

/** "Outgoing call · Left voicemail", "Email received", "File note". */
export function activityTitle(a) {
  const inbound = a.direction === 'inbound';
  const base = {
    call: inbound ? 'Incoming call' : 'Outgoing call',
    email: inbound ? 'Email received' : 'Email sent',
    sms: inbound ? 'Text received' : 'Text sent',
    letter: inbound ? 'Letter received' : 'Letter sent',
    meeting: 'Meeting',
    note: 'File note',
    stage: a.subject || 'Stage changed',
  }[a.kind] || KIND_META[a.kind]?.label || a.kind;
  return a.kind === 'call' && a.outcome ? `${base} · ${a.outcome}` : base;
}

// Early, middle and late pipeline stages get their own colour so the board and
// the list read as a progression rather than a wall of one colour.
const STAGE_TONE = {
  lead: 'teal', research: 'teal',
  initial_meeting: 'blue', fact_find: 'blue', soa: 'blue', peer_review: 'blue',
  soa_presented: 'purple', application: 'purple', underwriting: 'purple', completion: 'purple',
  in_force: 'green', on_hold: 'amber', not_proceeding: 'red',
};
export const stageTone = (key) => STAGE_TONE[key] || '';

const pad = (n) => String(n).padStart(2, '0');

/** Today as a local calendar day (not UTC, which is yesterday most mornings here). */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** A Date as the value a datetime-local input expects, in local time. */
export function toLocalInput(value = new Date()) {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Mon 21 Sep 2026, 3:40 pm" */
export function whenLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** 2026-09-09 -> "Wed 9 Sep" for a calendar day. */
export function dayShort(ymd) {
  if (!ymd) return '';
  const d = new Date(`${String(ymd).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole calendar days from `iso` to today (negative for the future). */
export function daysAgo(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
}

/** "2 hours ago", "yesterday", "12 days ago", "in 3 days" — then a date. */
export function relative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
  const days = daysAgo(iso);
  if (diffMin >= 0 && diffMin < 1) return 'just now';
  if (diffMin > 0 && diffMin < 60) return `${diffMin} min ago`;
  if (days === 0) {
    const time = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
    return diffMin < 0 ? `today at ${time}` : `${Math.round(diffMin / 60)} h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days === -1) return 'tomorrow';
  if (days > 1 && days < 14) return `${days} days ago`;
  if (days < -1 && days > -14) return `in ${-days} days`;
  if (days >= 14 && days < 60) return `${Math.round(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

let metaCache = null;

/** Stage list, loggable kinds and advisers from the API, fetched once per session. */
export function useCrmMeta() {
  const [meta, setMeta] = useState(metaCache);
  useEffect(() => {
    if (metaCache) return;
    api.get('/crm/meta').then((m) => { metaCache = m; setMeta(m); }).catch(() => {});
  }, []);
  return meta;
}

/** Forget the cached meta, e.g. after a new adviser name is saved. */
export const refreshCrmMeta = () => { metaCache = null; };

/** Copy text to the clipboard, falling back for non-secure contexts. */
export async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = value;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/** A Legacy premium tier from the practice settings, by key. */
export const tierOf = (meta, key) => meta?.practice?.tiers?.find((t) => t.key === key) || null;

/** Everyone a conversation might be with besides the client: the team, then the insurers. */
export function counterparties(meta) {
  const team = (meta?.practice?.team || []).map((m) => `${m.name} (${m.roles[0]})`);
  const insurers = (meta?.practice?.insurers || []).flatMap((i) => [`${i} underwriting`, `${i} new business`]);
  return [...team, ...insurers];
}

/** Referral sources to offer: Legacy's referral partners, then the other usual sources. */
export const referralOptions = (meta) => [
  ...(meta?.practice?.referralPartners || []).map((p) => p.name),
  ...(meta?.practice?.otherReferralSources || []),
];
