import { 
  TrendingUp, BarChart3, ClipboardList, ListChecks, LogOut, Moon, Sun, 
  Shield, CloudOff, Cloud, Menu, X, UserCheck, Dumbbell, Info, 
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
            ¿Tienes alguna sugerencia, encontraste un error o quieres hablar sobre entrenamiento? No dudes en escribirme.
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

export function Layout({ view, onView, children, headerExtra }: LayoutProps) {
  const { user, logout, pendingMutations } = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false); // Estado del modal
  const isAdmin = user?.role === 'admin';

  // Forzar que el administrador permanezca exclusivamente en la vista de administración
  useEffect(() => {
    if (isAdmin && view !== 'admin') {
      onView('admin');
    }
  }, [isAdmin, view, onView]);

  const currentInfo = VIEW_INFO[view];

  const handleNavClick = (id: View) => {
    onView(id);
    setMobileOpen(false);
  };

  const navItems = (
    <>
      {/* Si es admin, ocultamos completamente las pestañas de entrenamiento personales */}
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
      <header className="sticky top-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button 
                className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500" 
                onClick={() => setMobileOpen((v) => !v)} 
                aria-label="Menú"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
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

            <div className="flex items-center gap-2 sm:gap-3">
              {headerExtra}
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mr-2">
                {pendingMutations > 0 ? (
                  <><CloudOff size={14} className="text-amber-500" /><span className="whitespace-nowrap">{pendingMutations} pendientes</span></>
                ) : (
                  <><Cloud size={14} className="text-emerald-500" /><span className="whitespace-nowrap">Sincronizado</span></>
                )}
              </div>
              
              {/* Botón de Contacto Desktop */}
              <button 
                onClick={() => setIsContactModalOpen(true)} 
                className="hidden sm:flex p-2.5 rounded-xl text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 dark:bg-brand-500/10 dark:hover:bg-brand-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500" 
                aria-label="Contactar al desarrollador"
                title="Soporte y Contacto"
              >
                <MessageCircle size={20} className="sm:w-[18px] sm:h-[18px]"/>
              </button>

              <button 
                onClick={toggleTheme} 
                className="p-2 sm:p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500" 
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={20} className="sm:w-[18px] sm:h-[18px]"/> : <Moon size={20} className="sm:w-[18px] sm:h-[18px]" />}
              </button>

              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-gray-200 dark:border-gray-800">
                <div className="text-right min-w-0">
                  <p className="text-xs text-gray-400 leading-tight">Bienvenido</p>
                  <p className="text-sm font-semibold leading-tight truncate max-w-[120px]">{user?.name}</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </div>

              <button 
                onClick={logout} 
                className="p-2 sm:p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500" 
                aria-label="Cerrar sesión" 
                title="Cerrar sesión"
              >
                <LogOut size={20} className="sm:w-[18px] sm:h-[18px]" />
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

        {/* Mobile Navigation Dropdown */}
        {mobileOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f0f10] shadow-lg z-50">
             <nav className="flex flex-col px-4 py-3 gap-1.5 animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto">
               <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 sm:hidden">
                 <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-base font-bold shrink-0">
                    {user?.name?.charAt(0).toUpperCase()}
                 </div>
                 <div>
                   <p className="text-xs text-gray-400">Sesión iniciada como</p>
                   <p className="text-sm font-semibold">{user?.name}</p>
                 </div>
               </div>
               
               {navItems}

               {/* Botón de Contacto Mobile */}
               <button
                 onClick={() => {
                   setMobileOpen(false);
                   setIsContactModalOpen(true);
                 }}
                 className="flex items-center mt-2 w-full gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-brand-500 bg-brand-500/10 hover:bg-brand-500/20 transition-all duration-200"
               >
                 <MessageCircle size={20} className="shrink-0" />
                 <span>Soporte y Contacto</span>
               </button>
               
               <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 sm:hidden">
                  {pendingMutations > 0 ? (
                    <><CloudOff size={16} className="text-amber-500" /><span>{pendingMutations} pendientes</span></>
                  ) : (
                    <><Cloud size={16} className="text-emerald-500" /><span>Sincronizado</span></>
                  )}
               </div>
             </nav>
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
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

      {/* Renderizado del Modal */}
      <DeveloperContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
    </div>
  );
}
