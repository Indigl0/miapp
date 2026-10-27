import { Sparkles, Flame, Trophy, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface TrophiaCoachProps {
  pendingRoutinesCount?: number;
}

export function TrophiaCoach({ pendingRoutinesCount = 0 }: TrophiaCoachProps) {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(' ')[0] : 'Felipe';

  // Obtener el día actual de la semana en español
  const todayName = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  const capitalizedDay = todayName.charAt(0).toUpperCase() + todayName.slice(1);

  // Seleccionar frase motivacional según rutinas pendientes
  const getMotivationalContent = () => {
    if (pendingRoutinesCount > 0) {
      return {
        icon: Flame,
        badge: `¡Día de acción! · ${capitalizedDay}`,
        title: `¡A por todo, ${firstName}! 🔥`,
        text: `Tienes ${pendingRoutinesCount} rutina${pendingRoutinesCount > 1 ? 's' : ''} pendiente${pendingRoutinesCount > 1 ? 's' : ''} esta semana. Tu mejor versión se construye hoy en el gimnasio, ¡rompamos récords!`
      };
    } else {
      return {
        icon: Trophy,
        badge: `¡Excelente semana! · ${capitalizedDay}`,
        title: `¡Imparable, ${firstName}! 🏆`,
        text: `Has mantenido el ritmo de forma brillante. Recuerda que el descanso también es parte del crecimiento muscular. ¡Sigue así!`
      };
    }
  };

  const content = getMotivationalContent();
  const IconComponent = content.icon;

  return (
    <div className="mb-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500/15 via-brand-500/5 to-transparent border border-brand-500/20 p-5 sm:p-6 shadow-sm transition-all">
      {/* Elemento decorativo de fondo */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>

      <div className="flex items-start gap-4 relative z-10">
        <div className="p-3 rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 shrink-0 mt-0.5">
          <IconComponent size={24} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 tracking-wide">
              <Sparkles size={12} />
              {content.badge}
            </span>
          </div>
          
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight mb-1">
            {content.title}
          </h3>
          
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {content.text}
          </p>
        </div>
      </div>
    </div>
  );
}
