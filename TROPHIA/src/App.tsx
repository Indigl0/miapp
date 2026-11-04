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
import { X, Dumbbell } from 'lucide-react'; // <-- Icono añadido para el toast

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
      {/* Notificación flotante superior con estilo corporativo y animación suave */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-brand-500 text-white px-4.5 py-3 rounded-2xl shadow-xl shadow-brand-500/25 flex items-center gap-3 animate-fade-in border border-brand-400/40">
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Dumbbell size={15} className="text-white" />
          </div>
          <span className="text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="opacity-75 hover:opacity-100 p-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors cursor-pointer ml-1"
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
            // Si estás en otra sección (Físico, Análisis, etc.), el logo te lleva de vuelta a Sesión
            setView('session');
          } else if (activeSessionId) {
            // Si estás en Sesión y hay entrenamiento activo, muestra el aviso elegante
            showToast("Entrenamiento en curso. Usa 'Pausar' para salir");
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
