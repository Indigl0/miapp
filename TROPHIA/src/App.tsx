import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Layout, type View } from '@/components/Layout';
import { LoginView } from '@/components/LoginView';
import { AdminPanel } from '@/components/AdminPanel';
import { ExercisesView } from '@/components/ExercisesView'; 
import { RoutinesView } from '@/components/RoutinesView';
import { SessionView } from '@/components/SessionView';
import { AnalyticsView } from '@/components/AnalyticsView';
import { MetricsView } from '@/components/MetricsView';
import { FullPageSpinner } from '@/components/ui/Feedback';

function AppContent() {
  const { user, ready } = useAuth();
  const [view, setView] = useState<View>('session');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin' && view === 'admin') {
      setView('session');
    }
  }, [user, view]);

  if (!ready) return <FullPageSpinner />;
  if (!user) return <LoginView />;

  return (
    <Layout view={view} onView={setView}>
      {/* Vista del Catálogo de Ejercicios */}
      {view === 'exercises' && <ExercisesView />}
      
      {/* Vista de Rutinas */}
      {view === 'routines' && <RoutinesView />}
      
      {/* Vista de Sesión de Entrenamiento Activa */}
      {view === 'session' && (
        <SessionView 
          activeSessionId={activeSessionId} 
          onActiveSessionChange={setActiveSessionId} 
        />
      )}
      
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
