import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { currency, dateTime, initials } from '../lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import { Loading } from '../components/ui/Loading.jsx';
import Badge from '../components/ui/Badge.jsx';

function Stat({ label, value, foot, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const nav = useNavigate();

  useEffect(() => { api.get('/dashboard').then(setData).catch(() => setData(false)); }, []);

  return (
    <>
      <PageHeader title="Dashboard" sub="✅ LIVE — this line was just changed by Claude!" />
      <div className="content">
        {!data ? (
          <Loading />
        ) : (
          <div className="stack">
            <div className="grid grid-4">
              <Stat tone="accent" label="Assets Under Management" value={currency(data.stats.aum)} foot="Across all current holdings" />
              <Stat tone="blue" label="Clients" value={data.stats.clients} foot={`${data.stats.groups} household${data.stats.groups === 1 ? '' : 's'}`} />
              <Stat tone="purple" label="Financial Plans" value={data.stats.plans} foot={`${data.stats.documents} documents on file`} />
              <Stat tone="green" label="Training Examples" value={data.stats.training} foot="Historical plans & emails" />
            </div>

            <div className="grid grid-2">
              <div className="card">
                <div className="card-head"><h3>Recent Clients</h3>
                  <button className="btn sm ghost" onClick={() => nav('/clients')}>View all →</button>
                </div>
                <div className="card-pad" style={{ paddingTop: 6 }}>
                  {data.recent.clients.length === 0 ? <p className="muted">No clients yet.</p> :
                    data.recent.clients.map((c) => (
                      <div key={c.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                           onClick={() => nav(`/clients/${c.id}`)}>
                        <div className="row">
                          <div className="avatar">{initials(c.first_name, c.last_name)}</div>
                          <div>
                            <div className="t-strong">{c.first_name} {c.last_name}</div>
                            <div className="faint" style={{ fontSize: 12 }}>{dateTime(c.created_at)}</div>
                          </div>
                        </div>
                        <Badge value={c.status} />
                      </div>
                    ))}
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>Recent Plans</h3>
                  <button className="btn sm ghost" onClick={() => nav('/plans')}>Open →</button>
                </div>
                <div className="card-pad" style={{ paddingTop: 6 }}>
                  {data.recent.plans.length === 0 ? <p className="muted">No plans yet.</p> :
                    data.recent.plans.map((p) => (
                      <div key={p.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <div className="t-strong">{p.title}</div>
                          <div className="faint" style={{ fontSize: 12 }}>Updated {dateTime(p.updated_at)}</div>
                        </div>
                        <Badge value={p.status} />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h3>Recent Follow-up Emails</h3>
                <button className="btn sm ghost" onClick={() => nav('/meetings')}>Open →</button>
              </div>
              <div className="card-pad" style={{ paddingTop: 6 }}>
                {data.recent.emails.length === 0 ? <p className="muted">No emails yet.</p> :
                  data.recent.emails.map((e) => (
                    <div key={e.id} className="row between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div className="t-strong">{e.subject || '(no subject)'}</div>
                      <div className="row"><span className="faint" style={{ fontSize: 12 }}>{dateTime(e.updated_at)}</span><Badge value={e.status} /></div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
