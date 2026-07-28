export const currency = (n, opts = {}) => {
  const v = Number(n || 0);
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  });
};

export const pct = (n, dp = 1) =>
  n == null || n === '' ? '—' : `${Number(n).toFixed(dp)}%`;

export const date = (d) => {
  if (!d) return '—';
  // A bare 'YYYY-MM-DD' is a calendar day, not an instant. `new Date` would read
  // it as UTC midnight and shift it a day in negative-offset timezones, so build
  // it in local time instead. Anything with a time component is a real instant.
  const ymd = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
  const dt = ymd
    ? new Date(...d.trim().split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))))
    : new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const dateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleString('en-US');
};

export const initials = (first = '', last = '') =>
  `${(first[0] || '').toUpperCase()}${(last[0] || '').toUpperCase()}` || '?';

export const titleCase = (s = '') =>
  s.replace(/(^|[\s_-])(\w)/g, (_, sep, c) => (sep === '_' || sep === '-' ? ' ' : sep) + c.toUpperCase());

export const fileSize = (bytes) => {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = Number(bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(i ? 1 : 0)} ${units[i]}`;
};
