import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

/**
 * Everything built before the workbench. Taken off the main navigation on
 * 22 Oct 2026 but kept working: nothing here was deleted, and every page still
 * opens at its old address.
 */
const ARCHIVE = [
  { to: '/archive/dashboard', icon: '◈', title: 'Old dashboard', desc: 'The original overview and generator launch cards.' },
  { to: '/tasks', icon: '✅', title: 'Task Tracker', desc: 'The task list, with notes, due dates and its own archive.' },
  { to: '/crm', icon: '🤝', title: 'CRM', desc: 'Contacts, logged communication, the XPLAN-thread pipeline board.' },
  { to: '/clients', icon: '👥', title: 'Clients (full profiles)', desc: 'Detailed client records, households, documents and financials.' },
  { to: '/generate/soa', icon: '📄', title: 'Insurance & Risk Planning', desc: 'The original one-page risk SOA generator.' },
  { to: '/generate/client-profile', icon: '🧾', title: 'Client Profile', desc: 'Client information and consent profile generator.' },
  { to: '/generate/insurance-report', icon: '🛡️', title: 'Insurance Report', desc: 'Current / indicative cover summary generator.' },
  { to: '/plans', icon: '📁', title: 'Advice Documents', desc: 'Library of generated plans and SOAs, with present and export.' },
  { to: '/meetings', icon: '💬', title: 'Meetings', desc: 'Uploaded meeting transcripts.' },
];

export default function Archive() {
  return (
    <>
      <PageHeader title="Archive" sub="Earlier tools, kept as they were" />
      <div className="content">
        <p className="muted" style={{ marginTop: 0, maxWidth: 720 }}>
          These are the tools from before the workbench. They still work and keep their data. They are just off the main menu.
        </p>
        <div className="archive-grid">
          {ARCHIVE.map((a) => (
            <Link key={a.to} to={a.to} className="archive-card">
              <div className="ic">{a.icon}</div>
              <div className="t">{a.title}</div>
              <div className="d">{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
