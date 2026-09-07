import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { 
  UserCheck, 
  ClipboardList, 
  Dumbbell, 
  CheckSquare, 
  BarChart2, 
  Sun, 
  Moon, 
  LogOut, 
  CloudCheck, 
  Menu, 
  X,
  TrendingUp
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, signOut } = useAuth();
  const [theme, setTheme] = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lista de pestañas del menú principal
  const navItems = [
    { id: 'metrics', label: 'Métricas', icon: UserCheck },
    { id: 'routines', label: 'Rutinas', icon: ClipboardList },
    { id: 'exercises', label: 'Ejercicios', icon: Dumbbell },
    { id: 'session', label: 'Sesión', icon: CheckSquare },
    { id: 'analytics', label: 'Análisis', icon: BarChart2 },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getUserInitial = () => {
    if (!user) return 'U';
    const name = user.user_metadata?.full_name || user.email || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getUserName = () => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d0e] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* LOGO */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('metrics')}>
              <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <TrendingUp size={22} className="stroke-[2.5]" />
              </div>
              <span className="text-2xl font-black tracking-wider text-gray-900 dark:text-white uppercase">
                TROPHIA
              </span>
            </div>

            {/* CONTROLES DERECHA (Escritorio) */}
            <div className="hidden md:flex items-center gap-5">
              {/* Indicador Sincronizado */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                <CloudCheck size={16} />
                <span>Sincronizado</span>
              </div>

              {/* Toggle Tema (Claro / Oscuro) */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Cambiar tema"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* Perfil de Usuario */}
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-800">
                <div className="text-right">
                  <p className="text-xs text-gray-400 font-medium">Bienvenido</p>
                  <p className="text-sm font-bold truncate max-w-[120px]">{getUserName()}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {getUserInitial()}
                </div>
              </div>

              {/* Cerrar Sesión */}
              <button
                onClick={signOut}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* BOTÓN MENÚ MÓVIL */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-gray-500 dark:text-gray-400"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

          </div>
        </div>

        {/* NAVEGACIÓN SECUNDARIA / TAB BAR (Escritorio) */}
        <div className="hidden md:block border-t border-gray-100 dark:border-gray-800/60 bg-white dark:bg-[#121214]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-2 py-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* MENÚ DESPLEGABLE MÓVIL */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121214] px-4 pt-2 pb-4 space-y-2">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-xs">
                {getUserInitial()}
              </div>
              <span className="text-sm font-bold">{getUserName()}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1 text-xs text-red-500 font-semibold px-2 py-1 rounded-lg bg-red-50 dark:bg-red-950/40"
            >
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
