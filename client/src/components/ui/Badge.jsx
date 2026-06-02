import { titleCase } from '../../lib/format.js';

const TONE = {
  // client status
  active: 'green', prospect: 'blue', inactive: 'amber', archived: 'red',
  // plan status
  draft: 'amber', in_review: 'blue', final: 'green', delivered: 'teal',
  // email status
  approved: 'green', sent: 'teal',
  // scan status
  pending: 'amber', processing: 'blue', done: 'green', failed: 'red',
  // risk profiles
  conservative: 'teal', moderate: 'blue', balanced: 'blue', growth: 'purple', aggressive: 'red',
};

export default function Badge({ value, tone, children }) {
  const t = tone || TONE[value] || '';
  return <span className={`badge ${t}`}>{children || titleCase(value || '')}</span>;
}
