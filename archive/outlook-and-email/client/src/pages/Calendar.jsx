import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loading } from '../components/ui/Loading.jsx';

const BUSY = { 0: 'Free', 1: 'Tentative', 2: 'Busy', 3: 'Out of office', 4: 'Elsewhere' };
const BUSY_TONE = { 0: 'green', 1: 'amber', 2: 'blue', 3: 'red', 4: 'purple' };

const dayKey = (iso) => iso.slice(0, 10);
const fmtDay = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

function isSameDay(a, b) { return dayKey(a) === dayKey(b); }
const todayKey = () => new Date().toISOString().slice(0, 10);

function EventRow({ ev }) {
  const tone = BUSY_TONE[ev.busyStatus] || 'blue';
  return (
    <div className="row between" style={{ padding: '11px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        <div style={{ minWidth: 108, color: 'var(--text-muted)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {ev.allDay ? 'All day' : `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`}
        </div>
        <div>
          <div className="t-strong">{ev.subject || '(no title)'}</div>
          <div className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>
            {[ev.location, ev.organizer && `with ${ev.organizer}`].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {ev.recurring && <span className="badge">↻ Recurring</span>}
        <span className={`badge ${tone}`}>{BUSY[ev.busyStatus] || 'Busy'}</span>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [status, setStatus] = useState(null);   // { available }
  const [events, setEvents] = useState(null);    // array | null (loading) | false (error)
  const [error, setError] = useState('');
  const [ahead, setAhead] = useState(90);
  const [busy, setBusy] = useState(false);

  const load = useCallback((days) => {
    setBusy(true); setError(''); setEvents(null);
    api.get(`/outlook/calendar?back=1&ahead=${days}`)
      .then((r) => setEvents(r.events || []))
      .catch((e) => { setEvents(false); setError(e?.message || 'Could not read the Outlook calendar.'); })
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    api.get('/outlook/status')
      .then((s) => { setStatus(s); if (s.available) load(ahead); else setEvents(false); })
      .catch(() => { setStatus({ available: false }); setEvents(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRange = (days) => { setAhead(days); load(days); };

  // group by day, keep order (server returns ascending)
  const groups = [];
  if (Array.isArray(events)) {
    let cur = null;
    for (const ev of events) {
      const k = dayKey(ev.start);
      if (!cur || cur.key !== k) { cur = { key: k, iso: ev.start, items: [] }; groups.push(cur); }
      cur.items.push(ev);
    }
  }

  const refreshBtn = (
    <button className="btn sm" disabled={busy || !status?.available} onClick={() => load(ahead)}>
      {busy ? <span className="spinner" /> : '↻'} Refresh
    </button>
  );

  return (
    <>
      <PageHeader title="Calendar" sub="Meetings & follow-ups from your Outlook desktop" actions={refreshBtn} />
      <div className="content">
        <div className="stack">
          <div className="card">
            <div className="card-head">
              <div className="row" style={{ gap: 10 }}>
                <span className={`ai-dot ${status?.available ? 'on' : 'off'}`} style={{ boxShadow: 'none' }} />
                <span className="t-strong">
                  {status == null ? 'Checking Outlook…' : status.available ? 'Outlook connected' : 'Outlook not available'}
                </span>
              </div>
              <div className="tabs" style={{ border: 'none', margin: 0 }}>
                {[7, 30, 90].map((d) => (
                  <div key={d} className={`tab ${ahead === d ? 'active' : ''}`} onClick={() => onRange(d)}>
                    Next {d}d
                  </div>
                ))}
              </div>
            </div>

            <div className="card-pad">
              {events === null ? (
                <Loading />
              ) : events === false ? (
                <div className="empty">
                  <div className="e-ico">📅</div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {status?.available
                      ? (error || 'Could not read the calendar.')
                      : 'The Outlook calendar link runs on your Windows desktop with Outlook signed in. It isn’t available on this host.'}
                  </p>
                  {status?.available && <button className="btn sm" onClick={() => load(ahead)} style={{ marginTop: 10 }}>Try again</button>}
                </div>
              ) : groups.length === 0 ? (
                <div className="empty"><div className="e-ico">🗓️</div><p className="muted">No appointments in this window.</p></div>
              ) : (
                <div className="stack" style={{ gap: 22 }}>
                  {groups.map((g) => (
                    <div key={g.key}>
                      <div className="section-label" style={{ marginBottom: 8 }}>
                        {g.key === todayKey() ? 'Today' : fmtDay(g.iso)}
                      </div>
                      {g.items.map((ev, i) => <EventRow key={ev.entryId || i} ev={ev} />)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
