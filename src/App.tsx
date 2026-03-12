import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import AppShell from './components/layout/AppShell';
import LoginPage from './components/auth/LoginPage';
import ZendeskReportGenerator from './components/report/ZendeskReportGenerator';
import { MacroAppProvider } from './components/macros/context/MacroAppContext';
import MacroLibraryPage from './components/macros/pages/MacroLibraryPage';
import MacroReviewPage from './components/macros/pages/MacroReviewPage';
import MacroSettingsPage from './components/macros/pages/MacroSettingsPage';

function MacroLayout() {
  return (
    <MacroAppProvider>
      <div className="max-w-3xl mx-auto px-8 py-10">
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

function ProtectedApp() {
  const { user, loading, authEnabled } = useAuth();

  if (authEnabled && loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#253C32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#61716A', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (authEnabled && !user) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/report" replace />} />
        <Route path="/report" element={<ZendeskReportGenerator />} />
        <Route path="/macros/*" element={<MacroLayout />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
