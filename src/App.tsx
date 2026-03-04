import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ZendeskReportGenerator from './components/report/ZendeskReportGenerator';
import { MacroAppProvider } from './components/macros/context/MacroAppContext';
import MacroNavTabs from './components/macros/MacroNavTabs';
import MacroLibraryPage from './components/macros/pages/MacroLibraryPage';
import MacroReviewPage from './components/macros/pages/MacroReviewPage';
import MacroSettingsPage from './components/macros/pages/MacroSettingsPage';

function MacroLayout() {
  return (
    <MacroAppProvider>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <MacroNavTabs />
        <Routes>
          <Route index element={<Navigate to="/macros/library" replace />} />
          <Route path="library" element={<MacroLibraryPage />} />
          <Route path="review" element={<MacroReviewPage />} />
          <Route path="settings" element={<MacroSettingsPage />} />
        </Routes>
      </div>
    </MacroAppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/report" replace />} />
          <Route path="/report" element={<ZendeskReportGenerator />} />
          <Route path="/macros/*" element={<MacroLayout />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
