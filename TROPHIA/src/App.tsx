import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth.tsx';
import { Layout, type View } from '@/components/Layout.tsx';
import { LoginView } from '@/components/LoginView.tsx';
import { AdminPanel } from '@/components/AdminPanel.tsx';
import { ExercisesView } from '@/components/ExercisesView.tsx';
import { RoutinesView } from '@/components/RoutinesView.tsx';
import { SessionView } from '@/components/SessionView.tsx';
import { AnalyticsView } from '@/components/AnalyticsView.tsx';
import { MetricsView } from '@/components/MetricsView.tsx';
import { FullPageSpinner } from '@/components/ui/Feedback.tsx';

function AppContent() {
  const { user, ready } = useAuth();
  // Vista inicial por defecto
  const [view, setView] = useState<View>('routines');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Reinicia la vista según el rol cuando cambia el usuario o su rol
  useEffect(() => {
    if (user) {
      if (user.role !== 'admin' && view === 'admin') {
        setView('routines');
      }
    }
  }, [user?.id, user?.role, view]);

  if (!ready) return <FullPageSpinner />;
  if (!user) return <LoginView />;

  return (
    <Layout view={view} onView={setView}>
      {view === 'exercises' && <ExercisesView />}
      {view === 'routines' && <RoutinesView />}
      {view === 'session' && <SessionView activeSessionId={activeSessionId} onActiveSessionChange={setActiveSessionId} />}
      {view === 'analytics' && <AnalyticsView />}
      {view === 'metrics' && <MetricsView />}
      {view === 'admin' && user.role === 'admin' && <AdminPanel />}
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
