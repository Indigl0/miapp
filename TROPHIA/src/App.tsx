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
import { X, Dumbbell } from 'lucide-react';

function AppContent() {
  const { user, ready } = useAuth();
  const [view, setView] = useState<View>('session');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
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
      <style>{`
        @keyframes noticeableBounce {
          0%, 100% {
            transform: translate(-50%, 0);
          }
          50% {
            transform: translate(-50%, -12px);
          }
        }
        .animate-noticeable-bounce {
          animation: noticeableBounce 1s ease-in-out infinite;
        }
      `}</style>

      {/* Notificación flotante inferior con rebote más notorio */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4.5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 dark:border-gray-200 animate-noticeable-bounce">
          <div className="w-7 h-7 rounded-xl bg-brand-500 flex items-center justify-center shrink-0 text-white shadow-sm">
            <Dumbbell size={15} />
          </div>
          <span className="text-xs sm:text-sm font-medium tracking-tight whitespace-nowrap">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="opacity-70 hover:opacity-100 p-1 rounded-lg transition-colors cursor-pointer ml-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <Layout 
        view={view} 
        onView={(newView) => {
          if (activeSessionId && newView !== 'session') {
            showToast("Entrenamiento en curso. Usa 'Pausar' para salir");
            return;
          }
          setView(newView);
        }} 
        isSessionActive={!!activeSessionId}
        onLogoClick={() => {
          if (view !== 'session') {
            setView('session');
          } else if (activeSessionId) {
            showToast("Entrenamiento en curso. Usa 'Pausar' para salir");
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
