import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Layout, type View } from '@/components/Layout';
import { LoginView } from '@/components/LoginView';
import { AdminPanel } from '@/components/AdminPanel';
import { ExercisesView } from '@/components/ExercisesView';
import { RoutinesView } from '@/components/RoutinesView';
import { SessionView } from '@/components/SessionView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { FullPageSpinner } from '@/components/ui/Feedback';

function AppContent() {
  const { user, ready } = useAuth();
  const [view, setView] = useState<View>('routines');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  if (!ready) return <FullPageSpinner />;
  if (!user) return <LoginView />;

  const handleStartSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setView('session');
  };

  return (
    <Layout view={view} onView={setView}>
      {view === 'routines' && <RoutinesView onStartSession={handleStartSession} />}
      {view === 'exercises' && <ExercisesView />}
      {view === 'session' && <SessionView activeSessionId={activeSessionId} onActiveSessionChange={setActiveSessionId} />}
      {view === 'analytics' && <AnalyticsView />}
      {view === 'admin' && <AdminPanel />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
