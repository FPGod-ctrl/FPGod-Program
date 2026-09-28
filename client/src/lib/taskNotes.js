/**
 * Task notes, shared by the Task Tracker and the CRM's task panel.
 *
 * Notes are stored as one pipe-delimited string so the spreadsheet's Notes column
 * stays a single editable cell. Entries the app writes carry a date and time;
 * older ones carry a date only, and anything without a leading stamp at all (a
 * note typed straight into Excel) is kept as an undated entry rather than dropped.
 */
export function parseNotes(notes) {
  if (!notes) return [];
  return notes
    .split(' | ')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?:\s*([\s\S]*)$/);
      if (!m) return { date: '', time: '', text: chunk };
      return { date: m[1], time: m[2] || '', text: m[3] };
    });
}

/** 2026-09-09 -> "Wed 9 Sep", which is what a person actually reads. */
export function prettyDate(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export const TASK_STATUSES = ['Open', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
export const isOpenTask = (t) => t.status !== 'Done' && t.status !== 'Cancelled';
