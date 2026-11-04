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
      {/* Toast con diseño corporativo naranja centrado arriba */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-brand-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce border border-brand-400/40">
          <span className="text-sm font-semibold tracking-wide">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="opacity-80 hover:opacity-100 p-1 rounded-lg bg-black/10 hover:bg-black/20 transition-colors cursor-pointer"
          >
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
            // Si estás en otra pestaña (Ejercicios, Análisis, Físico), el logo te lleva a Sesión
            setView('session');
          } else if (activeSessionId) {
            // Si estás en Sesión y hay entrenamiento activo, muestra el aviso naranja
            showToast("Tienes un entrenamiento en curso. Usa el botón 'Pausar' para salir");
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
