import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api/client.js';

const NAV = [
  { section: 'Overview' },
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/tasks', label: 'Task Tracker', icon: '✅' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { section: 'Advice' },
  { to: '/generate/soa', label: 'Insurance & Risk Planning', icon: '📄' },
  { to: '/generate/client-profile', label: 'Client Profile', icon: '🧾' },
  { to: '/generate/insurance-report', label: 'Insurance Report', icon: '🛡️' },
  { to: '/generate/follow-ups', label: 'Follow-on & Phone Email', icon: '✉️' },
  { section: 'Practice' },
  { to: '/plans', label: 'Advice Documents', icon: '📁' },
  { to: '/meetings', label: 'Meetings & Emails', icon: '💬' },
  { section: 'System' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

function Sidebar({ meta, theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">L</div>
        <div>
          <div className="brand-name">Legacy Risk Advice</div>
          <div className="brand-sub">Insurance &amp; Risk Planning</div>
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
        <button className="theme-toggle" onClick={onToggleTheme} title="Switch theme">
          <span className="tt-ico">{theme === 'linen' ? '🌙' : '☀️'}</span>
          {theme === 'linen' ? 'Dark mode' : 'Light mode'}
        </button>
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => { api.get('/meta').then(setMeta).catch(() => {}); }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'linen' ? 'dark' : 'linen'));
  return (
    <div className="app-shell">
      <Sidebar meta={meta} theme={theme} onToggleTheme={toggleTheme} />
      <div className="main">
        <Outlet context={{ meta }} />
      </div>
    </div>
  );
}
