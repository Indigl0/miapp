import { 
  TrendingUp, BarChart3, ClipboardList, ListChecks, LogOut, Moon, Sun, 
  Shield, CloudOff, Cloud, X, User, Dumbbell, Info, 
  Instagram, Mail, MessageCircle 
} from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { APP_VERSION } from '../version';

export type View = 'exercises' | 'routines' | 'session' | 'analytics' | 'metrics' | 'admin';

interface LayoutProps {
  view: View;
  onView: (v: View) => void;
  children: ReactNode;
  headerExtra?: ReactNode;
  isSessionActive?: boolean;
}

const NAV: Array<{ id: View; label: string; icon: typeof TrendingUp }> = [
  { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
  { id: 'routines', label: 'Rutinas', icon: ClipboardList },
  { id: 'session', label: 'Sesión', icon: ListChecks },
  { id: 'analytics', label: 'Análisis', icon: BarChart3 },
  { id: 'metrics', label: 'Físico', icon: User },
];

const VIEW_INFO: Record<View, { title: string; description: string }> = {
  exercises: {
    title: 'Catálogo e Inicio',
    description: 'Biblioteca general de ejercicios estructurados por grupo muscular. Configura el nombre, la zona objetivo y la categoría para utilizarlos en el armado de tus rutinas o registrar ejecuciones libres.'
  },
  routines: {
    title: 'Plantillas de Entrenamiento',
    description: 'Planificación y diseño de sesiones de entrenamiento reutilizables. Define la estructura de tu programa organizando los ejercicios, series objetivo, rangos de repeticiones y tiempos de descanso esperados.'
  },
  session: {
    title: 'Ejecución en Tiempo Real',
    description: 'Bitácora de entrenamiento en el gimnasio. Inicia una sesión basada en tus rutinas o de formato libre para registrar de forma activa el peso levantado, repeticiones efectivas y esfuerzo percibido en cada serie.'
  },
  analytics: {
    title: 'Rendimiento y Sobrecarga Progresiva',
    description: 'Métricas avanzadas de progreso. Evalúa la evolución del volumen total de carga, la distribución del trabajo muscular y el indicador de RIR (Repeticiones en Recámara) para maximizar la hipertrofia y prevenir el sobreentrenamiento.'
  },
  metrics: {
    title: 'Seguimiento Físico',
    description: 'Control y evolución morfofisiológica. Registra los cambios en tu peso corporal, perímetros y composición general para evaluar visual y numéricamente tu transformación en el tiempo.'
  },
  admin: {
    title: 'Panel de Administración',
    description: 'Gestión global de usuarios, permisos y configuración del sistema TROPHIA.'
  }
};

// --- COMPONENTE DEL MODAL DE CONTACTO ---
function DeveloperContactModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm p-6 bg-white dark:bg-[#1a1a1b] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center mt-2">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-brand-500/30 mb-4">
            FI
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Felipe Ibarra</h2>
          <p className="text-sm text-brand-500 font-semibold mb-4">Creador de TROPHIA</p>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            ¿Tienes alguna sugerencia, encontraste un error o tienes ideas para mejorar la app? No dudes en escribirme.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <a 
              href="https://instagram.com/f.7barra" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold transition-colors shadow-md shadow-brand-500/20"
            >
              <Instagram size={20} />
              Contactar por Instagram
            </a>

            <a 
              href="mailto:felipe7barra@gmail.com" 
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-transparent border-2 border-gray-200 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-colors"
            >
              <Mail size={20} />
              Enviar un correo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ view, onView, children, headerExtra, isSessionActive = false }: LayoutProps) {
  const { user, logout, pendingMutations } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin && view !== 'admin') {
      onView('admin');
    }
  }, [isAdmin, view, onView]);

  const currentInfo = VIEW_INFO[view];

  const handleNavClick = (id: View) => {
    onView(id);
  };

  const navItems = (
    <>
      {!isAdmin && NAV.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            className={`flex items-center w-full md:w-auto gap-3 rounded-xl px-4 py-3 md:py-2.5 text-sm md:text-base font-semibold transition-all duration-200 ${
              active 
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <Icon size={20} className="shrink-0 md:w-[18px] md:h-[18px]" />
            <span>{item.label}</span>
          </button>
        );
      })}
      
      {isAdmin && (
        <button
          onClick={() => handleNavClick('admin')}
          className={`flex items-center w-full md:w-auto gap-3 rounded-xl px-4 py-3 md:py-2.5 text-sm md:text-base font-semibold transition-all duration-200 ${
            view === 'admin' 
              ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' 
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <Shield size={20} className="shrink-0 md:w-[18px] md:h-[18px]" />
          <span>Admin</span>
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#0f0f10]/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-20 items-center justify-between py-2">
            
            {/* Izquierda: Logo y Título */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 shadow-md shadow-brand-500/40 shrink-0">
                <TrendingUp size={24} className="text-white" />
              </div>
              <h1 className="font-condensed text-2xl sm:text-3xl font-extrabold tracking-tight whitespace-nowrap">
                TROPHIA
              </h1>
            </div>

            {/* Derecha: Estado de sincronización + Controles */}
            <div className="flex items-center gap-3 sm:gap-4 z-10">
              {headerExtra}
              
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60 px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-gray-800">
                {pendingMutations > 0 ? (
                  <><CloudOff size={14} className="text-amber-500 shrink-0" /><span className="whitespace-nowrap">{pendingMutations} pendientes</span></>
                ) : (
                  <><Cloud size={14} className="text-emerald-500 shrink-0" /><span className="whitespace-nowrap">Sincronizado</span></>
                )}
              </div>
              
              <button 
                onClick={() => setIsContactModalOpen(true)} 
                className="p-2.5 rounded-xl text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 dark:bg-brand-500/10 dark:hover:bg-brand-500/25 transition-colors focus:outline-none" 
                aria-label="Soporte y Contacto"
                title="Soporte y Contacto"
              >
                <MessageCircle size={20} />
              </button>

              <button 
                onClick={toggleTheme} 
                className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors focus:outline-none" 
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              <button 
                onClick={logout} 
                className="p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors focus:outline-none" 
                aria-label="Cerrar sesión" 
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>

          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:block border-t border-gray-100 dark:border-gray-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
              {navItems}
            </div>
          </div>
        </nav>
      </header>

      {/* Se añadió pb-28 para dar suficiente espacio al final y evitar que la barra inferior tape el contenido */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 pt-6 pb-28 sm:py-8 animate-fade-in">
        {currentInfo && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-500/5 border border-brand-500/15 flex items-start gap-3.5 transition-all">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 shrink-0 mt-0.5">
              <Info size={20} className="sm:w-[18px] sm:h-[18px]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {currentInfo.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                {currentInfo.description}
              </p>
            </div>
          </div>
        )}
        {children}
      </main>

      {/* --- BARRA DE NAVEGACIÓN INFERIOR MÓVIL --- */}
      {!isAdmin && !isSessionActive && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-45 bg-white/95 dark:bg-[#0f0f10]/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 px-2 py-1.5 shadow-2xl">
          <div className="grid grid-cols-5 gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all ${
                    active 
                      ? 'text-brand-500 bg-brand-500/10 font-bold scale-105' 
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-brand-500' : ''} />
                  <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0f0f10]/50 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 font-condensed tracking-wide text-center sm:text-left">TROPHIA · Offline-First PWA</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold text-center">
              Desarrollado por{' '}
              <button 
                onClick={() => setIsContactModalOpen(true)}
                className="text-brand-500 hover:text-brand-600 hover:underline transition-all"
              >
                Felipe Ibarra
              </button>
            </p>
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </footer>

      <DeveloperContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </div>
  );
}
