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

// Each generator area, styled as a launch card. `accent`/`soft` drive the card colour.
const TOOLS = [
  {
    to: '/generate/client-profile', icon: '🧾', title: 'Client Profile',
    desc: 'Generate the Lakeside client information & consent profile for a household, ready to review and export.',
    cta: 'Pick a client', accent: 'var(--accent-2)', soft: 'var(--accent-soft)', featured: true, pill: 'Featured',
  },
  {
    to: '/generate/insurance-report', icon: '🛡️', title: 'Insurance Report',
    desc: 'Build the current / indicative cover summary — clone-and-fill from the firm’s insurance report template.',
    cta: 'Pick a client', accent: 'var(--accent-2)', soft: 'var(--accent-soft)', featured: true, pill: 'Featured',
  },
  {
    to: '/generate/soa', icon: '📝', title: 'SOA & Financial Plan',
    desc: 'Draft a Statement of Advice or full financial plan from the house template, client data and your strategy notes.',
    cta: 'Open generator', accent: '#6366f1', soft: 'rgba(99,102,241,0.16)',
  },
  {
    to: '/generate/follow-ups', icon: '✉️', title: 'Follow-up Emails',
    desc: 'Turn a meeting transcript or call note into a follow-on-from-meeting or phone-call email in your voice.',
    cta: 'Open emails', accent: 'var(--primary)', soft: 'var(--primary-soft)',
  },
  {
    to: '/investments', icon: '📊', title: 'Investments & Fund Summaries',
    desc: 'Summarise products and holdings — e.g. wholesale fund IMs and super statements — into client-ready notes.',
    cta: 'Open investments', accent: 'var(--green)', soft: 'var(--green-soft)',
  },
  {
    to: '/clients', icon: '📥', title: 'Client Documents',
    desc: 'Drag & drop statements and paperwork into any client file — attributed to that client and AI-scanned to auto-fill their details.',
    cta: 'Open a client', accent: 'var(--amber)', soft: 'var(--amber-soft)',
  },
];

function ToolCard({ tool, onOpen }) {
  return (
    <button
      className={`tool-card ${tool.featured ? 'featured' : ''}`}
      style={{ '--tool-accent': tool.accent, '--tool-soft': tool.soft }}
      onClick={() => onOpen(tool.to)}
    >
      {tool.pill && <span className="tool-pill">{tool.pill}</span>}
      <div className="tool-ico">{tool.icon}</div>
      <div className="tool-title">{tool.title}</div>
      <div className="tool-desc">{tool.desc}</div>
      <span className="tool-cta">{tool.cta} <span aria-hidden>→</span></span>
    </button>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const nav = useNavigate();

  useEffect(() => { api.get('/dashboard').then(setData).catch(() => setData(false)); }, []);

  return (
    <>
      <PageHeader title="Home" sub="Your generator toolkit and practice at a glance" />
      <div className="content">
        <div className="stack">
          {/* Hero */}
          <div className="hub-hero">
            <div className="eyebrow">Lakeside Financial · AI Toolkit</div>
            <h1>What would you like to generate today?</h1>
            <p>
              Pick a tool below to draft client-ready documents in your house style — profiles, insurance
              reports, SOAs, follow-up emails and fund summaries — all from the data and templates you already hold.
            </p>
          </div>

          {/* Tool launcher */}
          <div className="section-label">Generator toolkit</div>
          <div className="tool-grid">
            {TOOLS.map((t) => <ToolCard key={t.title} tool={t} onOpen={nav} />)}
          </div>

          {/* Practice snapshot */}
          <div className="section-label">Practice snapshot</div>
          {!data ? (
            <Loading />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
