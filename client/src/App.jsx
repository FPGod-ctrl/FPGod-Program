import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Documents from './pages/Documents.jsx';
import PlanGenerator from './pages/PlanGenerator.jsx';
import Investments from './pages/Investments.jsx';
import Meetings from './pages/Meetings.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="documents" element={<Documents />} />
          <Route path="plans" element={<PlanGenerator />} />
          <Route path="investments" element={<Investments />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
