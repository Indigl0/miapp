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
import { X } from 'lucide-react';

function AppContent() {
  const { user, ready } = useAuth();
  const [view, setView] = useState<View>('session');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Detectar automáticamente si el cronómetro de descanso está activo en pantalla
  useEffect(() => {
    const checkTimer = () => {
      const hasTimer = Array.from(document.querySelectorAll('*')).some(el => 
        el.textContent?.includes('DESCANSO ACTIVO')
      );
      setIsTimerActive(hasTimer);
    };

    const interval = setInterval(checkTimer, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin' && view === 'admin') {
      setView('session');
    }
  }, [user, view]);

  if (!ready) return <FullPageSpinner />;
  if (!user) return <LoginView />;

  return (
    <>
      {/* Notificación con posición dinámica basada en el estado del cronómetro */}
      {toastMessage && (
        <div className={`fixed left-0 right-0 mx-auto z-50 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-bounce w-[92%] max-w-sm transition-all duration-300 ${
          isTimerActive ? 'bottom-32' : 'bottom-6'
        }`}>
          <span className="text-xs sm:text-sm font-medium text-center flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100 cursor-pointer shrink-0">
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
          if (view !== 'session') {
            setView('session');
          } else if (activeSessionId) {
            showToast("Tienes un entrenamiento en curso. Usa el botón 'Pausar' para salir");
          }
        }}
      >
        {view === 'exercises' && <ExercisesView />}
        {view === 'routines' && <RoutinesView />}
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
