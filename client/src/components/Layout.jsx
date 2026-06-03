import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client.js';

const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/documents', label: 'Documents', icon: '📄' },
  { section: 'Advisory' },
  { to: '/plans', label: 'Plan Generator', icon: '📝' },
  { to: '/investments', label: 'Investments', icon: '📊' },
  { to: '/meetings', label: 'Meetings & Emails', icon: '✉️' },
  { section: 'System' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function Sidebar({ meta }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">F</div>
        <div>
          <div className="brand-name">FPGod</div>
          <div className="brand-sub">Financial Planning</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((item, i) =>
          item.section ? (
            <div key={`s-${i}`} className="nav-section">{item.section}</div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-ico">{item.icon}</span>
              {item.label}
            </NavLink>
          )
        )}
      </nav>
      <div className="sidebar-foot">
        <div className="ai-pill">
          <span className={`ai-dot ${meta?.aiEnabled ? 'on' : 'off'}`} />
          {meta ? (meta.aiEnabled ? `AI: ${meta.model}` : 'AI: stub mode') : 'AI: …'}
        </div>
        <div style={{ marginTop: 10 }}>v{meta?.version || '1.0.0'}</div>
      </div>
    </aside>
  );
}

export default function Layout() {
  const [meta, setMeta] = useState(null);
  useEffect(() => { api.get('/meta').then(setMeta).catch(() => {}); }, []);
  return (
    <div className="app-shell">
      <Sidebar meta={meta} />
      <div className="main">
        <Outlet context={{ meta }} />
      </div>
    </div>
  );
}
