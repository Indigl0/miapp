import { TrendingUp, BarChart3, ClipboardList, ListChecks, LogOut, Moon, Sun, Shield, CloudOff, Cloud, Menu, X, UserCheck, Dumbbell, Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { APP_VERSION } from '../version';

export type View = 'exercises' | 'routines' | 'session' | 'analytics' | 'metrics' | 'admin';

interface LayoutProps {
  view: View;
  onView: (v: View) => void;
  children: ReactNode;
  headerExtra?: ReactNode;
}

const NAV: Array<{ id: View; label: string; icon: typeof TrendingUp }> = [
  { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
  { id: 'routines', label: 'Rutinas', icon: ClipboardList },
  { id: 'session', label: 'Sesión', icon: ListChecks },
  { id: 'analytics', label: 'Análisis', icon: BarChart3 },
  { id: 'metrics', label: 'Métricas', icon: UserCheck },
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
    title: 'Composición Corporal',
    description: 'Seguimiento y control morfofisiológico. Registra la evolución de tu peso corporal, analiza las tendencias en el tiempo y ajusta tus parámetros nutricionales o metabólicos en función de tus objetivos.'
  },
  admin: {
    title: 'Panel de Administración',
    description: 'Gestión global de usuarios, permisos y configuración del sistema TROPHIA.'
  }
};

export function Layout({ view, onView, children, headerExtra }: LayoutProps) {
  const { user, logout, pendingMutations } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const currentInfo = VIEW_INFO[view];

  const navItems = (
    <>
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => { onView(item.id); setMobileOpen(false); }}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 break-words whitespace-nowrap ${
              active ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            <Icon size={18} className="shrink-0" />
            <span>{item.label}</span>
          </button>
        );
      })}
      {isAdmin && (
        <button
          onClick={() => { onView('admin'); setMobileOpen(false); }}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 break-words whitespace-nowrap ${
            view === 'admin' ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
          }`}
        >
          <Shield size={18} className="shrink-0" />
          <span>Admin</span>
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f10] text-gray-900 dark:text-gray-100 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#0f0f10]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setMobileOpen((v) => !v)} aria-label="Menú">
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 shadow-sm shadow-brand-500/30 shrink-0">
                  <TrendingUp size={20} className="text-white" />
                </div>
                <h1 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight break-words whitespace-nowrap">
                  TROPHIA
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-3">
              {headerExtra}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mr-1">
                {pendingMutations > 0 ? (
                  <><CloudOff size={14} className="text-amber-500" /><span className="break-words whitespace-nowrap">{pendingMutations} pendientes</span></>
                ) : (
                  <><Cloud size={14} className="text-emerald-500" /><span className="whitespace-nowrap">Sincronizado</span></>
                )}
              </div>
              <button onClick={toggleTheme} className="p-2 sm:p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors" aria-label="Cambiar tema">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-gray-800">
                <div className="text-right min-w-0">
                  <p className="text-xs text-gray-400 leading-tight">Bienvenido</p>
                  <p className="text-sm font-semibold leading-tight break-words truncate max-w-[120px]">{user?.name}</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <button onClick={logout} className="p-2 sm:p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
        <nav className="hidden md:block border-t border-gray-100 dark:border-gray-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto no-scrollbar">{navItems}</div>
          </div>
        </nav>
        {mobileOpen && (
          <nav className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0f0f10] px-4 py-3 flex flex-col gap-1 animate-fade-in">{navItems}</nav>
        )}
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
        {currentInfo && (
          <div className="mb-6 p-4 rounded-2xl bg-brand-500/5 border border-brand-500/15 flex items-start gap-3.5 transition-all">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 shrink-0 mt-0.5">
              <Info size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {currentInfo.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                {currentInfo.description}
              </p>
            </div>
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0f0f10]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400 font-condensed tracking-wide break-words">TROPHIA · Offline-First PWA</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold break-words text-center">
              Desarrollado y creado por <span className="text-brand-500">Felipe Ibarra</span>
            </p>
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-[10px] font-mono">
              {APP_VERSION}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
