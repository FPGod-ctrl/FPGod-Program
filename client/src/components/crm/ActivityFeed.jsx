import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Loading } from '../ui/Loading.jsx';
import { KIND_META, activityTitle, whenLong } from '../../lib/crm.js';

const KINDS = ['', 'call', 'email', 'meeting', 'sms', 'letter', 'note', 'stage'];
const PAGE = 60;

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Everything logged across every client, newest first — the practice's day at a glance. */
export default function ActivityFeed() {
  const [kind, setKind] = useState('');
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback(async (before) => {
    const qs = new URLSearchParams({ limit: String(PAGE) });
    if (kind) qs.set('kind', kind);
    if (before) qs.set('before', before);
    return api.get(`/crm/activities?${qs}`);
  }, [kind]);

  useEffect(() => {
    setItems(null);
    fetchPage()
      .then((rows) => { setItems(rows); setMore(rows.length === PAGE); setError(''); })
      .catch((err) => setError(err.message));
  }, [fetchPage]);

  const loadOlder = async () => {
    const rows = await fetchPage(items[items.length - 1].occurred_at);
    setItems([...items, ...rows]);
    setMore(rows.length === PAGE);
  };

  const groups = [];
  for (const a of items || []) {
    const label = new Date(a.occurred_at) > new Date() ? 'Upcoming' : dayLabel(a.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last[0] === label) last[1].push(a);
    else groups.push([label, [a]]);
  }

  return (
    <div>
      <div className="tl-filters">
        {KINDS.map((k) => (
          <button key={k || 'all'} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
            {k ? `${KIND_META[k].icon} ${KIND_META[k].plural}` : 'Everything'}
          </button>
        ))}
      </div>

      {error && <div className="alert red">{error}</div>}
      {!items && !error && <Loading />}
      {items && !items.length && (
        <div className="empty">
          <p>Nothing logged yet.</p>
          <p className="muted small">Open a contact and log a call, email or meeting — it will show here.</p>
        </div>
      )}

      {groups.map(([label, list]) => (
        <section key={label} className="feed-day">
          <div className="tl-month">{label}</div>
          <ul className="feed-list">
            {list.map((a) => (
              <li key={a.id} className="feed-item">
                <span className={`tl-dot k-${a.kind}`} aria-hidden="true">{KIND_META[a.kind]?.icon}</span>
                <div className="feed-main">
                  <div className="feed-head">
                    <Link to={`/crm/${a.client_id}`} className="feed-who">{a.display_name}</Link>
                    <span className="faint">·</span>
                    <span>{activityTitle(a)}</span>
                    {a.with_whom && <span className="faint">with {a.with_whom}</span>}
                    <span className="tl-when" title={whenLong(a.occurred_at)}>
                      {/* Past days are grouped by date already; upcoming ones need theirs. */}
                      {new Date(a.occurred_at) > new Date()
                        ? whenLong(a.occurred_at)
                        : new Date(a.occurred_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  {a.kind !== 'stage' && a.subject && <div className="tl-subject">{a.subject}</div>}
                  {a.kind !== 'stage' && a.body && <div className="feed-body">{a.body}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {more && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button className="btn sm" onClick={loadOlder}>Load older</button>
        </div>
      )}
    </div>
  );
}
