import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import ClientDetail from './pages/ClientDetail.jsx';
import Calendar from './pages/Calendar.jsx';
import PlanGenerator from './pages/PlanGenerator.jsx';
import Investments from './pages/Investments.jsx';
import CFSBook from './pages/CFSBook.jsx';
import CFSCampaign from './pages/CFSCampaign.jsx';
import Meetings from './pages/Meetings.jsx';
import GenerateClientProfile from './pages/generate/ClientProfile.jsx';
import GenerateInsuranceReport from './pages/generate/InsuranceReport.jsx';
import GenerateFollowUps from './pages/generate/FollowUps.jsx';
import GenerateSOA from './pages/generate/SOA.jsx';
import GenerateFinancialPlan from './pages/generate/FinancialPlan.jsx';
import Settings from './pages/Settings.jsx';
import PlanPresent from './pages/PlanPresent.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="generate/client-profile" element={<GenerateClientProfile />} />
          <Route path="generate/insurance-report" element={<GenerateInsuranceReport />} />
          <Route path="generate/follow-ups" element={<GenerateFollowUps />} />
          <Route path="generate/soa" element={<GenerateSOA />} />
          <Route path="generate/financial-plan" element={<GenerateFinancialPlan />} />
          <Route path="plans" element={<PlanGenerator />} />
          <Route path="investments" element={<Investments />} />
          <Route path="cfs" element={<CFSBook />} />
          <Route path="cfs/campaign" element={<CFSCampaign />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        {/* Standalone client-facing presentation/export (no app chrome). */}
        <Route path="present/:id" element={<PlanPresent />} />
      </Routes>
    </ToastProvider>
  );
}
