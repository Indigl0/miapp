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
import { TrophiaCoach } from '@/components/TrophiaCoach';
import { X } from 'lucide-react'; // <-- Importado para el botón de cerrar el toast global

function AppContent() {
  const { user, ready } = useAuth();
  const [view, setView] = useState<View>('session');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  useEffect(() => {
    if (user && user.role !== 'admin' && view === 'admin') {
      setView('session');
    }
  }, [user, view]);

  if (!ready) return <FullPageSpinner />;
  if (!user) return <LoginView />;

  return (
    <>
      {/* Toast global para avisos en toda la app */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      <Layout 
        view={view} 
        onView={(newView) => {
          if (activeSessionId && newView !== 'session') {
            showToast("Tienes un entrenamiento en curso. Usa el botón 'Pausar' para salir");
            return;
          }
          setView(newView);
        }} 
        isSessionActive={!!activeSessionId}
        onLogoClick={() => {
          if (activeSessionId) {
            showToast("Tienes un entrenamiento en curso. Usa the botón 'Pausar' para salir");
          }
        }}
      >
        {/* Vista del Catálogo de Ejercicios */}
        {view === 'exercises' && <ExercisesView />}
        
        {/* Vista de Rutinas */}
        {view === 'routines' && <RoutinesView />}
        
        {/* Vista de Sesión de Entrenamiento */}
        {view === 'session' && (
          <>
            {!activeSessionId && <TrophiaCoach />}
            
            <SessionView 
              activeSessionId={activeSessionId} 
              onActiveSessionChange={setActiveSessionId} 
            />
          </>
        )}
        
        {view === 'analytics' && <AnalyticsView />}
        {view === 'metrics' && <MetricsView />}
        {view === 'admin' && user.role === 'admin' && <AdminPanel />}
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
