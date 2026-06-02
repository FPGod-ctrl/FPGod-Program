import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { Empty } from '../components/ui/Loading.jsx';

export default function NotFound() {
  return (
    <>
      <PageHeader title="Not Found" />
      <div className="content">
        <Empty icon="🧭" title="Page not found">
          <div style={{ marginTop: 10 }}><Link to="/" className="btn primary">Back to Dashboard</Link></div>
        </Empty>
      </div>
    </>
  );
}
