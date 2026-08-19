import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

export function SessionTimer() {
  // Inicializar recuperando el tiempo y estado desde localStorage
  const [elapsed, setElapsed] = useState(() => {
    const savedStart = localStorage.getItem('trophia_session_start_time');
    const savedElapsed = localStorage.getItem('trophia_elapsed_seconds');
    const isRunning = localStorage.getItem('trophia_timer_running') === 'true';

    if (savedStart && isRunning) {
      return Math.floor((Date.now() - parseInt(savedStart, 10)) / 1000);
    }
    return savedElapsed ? parseInt(savedElapsed, 10) : 0;
  });

  const [running, setRunning] = useState(() => {
    return localStorage.getItem('trophia_timer_running') === 'true';
  });

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      let startTime = localStorage.getItem('trophia_session_start_time');
      if (!startTime) {
        startTime = Date.now().toString();
        localStorage.setItem('trophia_session_start_time', startTime);
      }
      localStorage.setItem('trophia_timer_running', 'true');

      const updateTimer = () => {
        const start = parseInt(localStorage.getItem('trophia_session_start_time') || Date.now().toString(), 10);
        const currentElapsed = Math.floor((Date.now() - start) / 1000);
        setElapsed(currentElapsed);
        localStorage.setItem('trophia_elapsed_seconds', currentElapsed.toString());
      };

      updateTimer();
      intervalRef.current = window.setInterval(updateTimer, 1000);

      // Sincronizar al instante cuando el usuario regresa a la pestaña o app móvil
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          updateTimer();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      localStorage.setItem('trophia_timer_running', 'false');
    }
  }, [running]);

  const fmtTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const toggleTimer = () => {
    if (!running) {
      if (!localStorage.getItem('trophia_session_start_time')) {
        localStorage.setItem('trophia_session_start_time', Date.now().toString());
      }
    }
    setRunning(!running);
  };

  const resetTimer = () => {
    setRunning(false);
    setElapsed(0);
    localStorage.removeItem('trophia_session_start_time');
    localStorage.removeItem('trophia_elapsed_seconds');
    localStorage.setItem('trophia_timer_running', 'false');
  };

  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 px-3 py-2">
      <Timer size={18} className="text-brand-500 shrink-0" />
      <span className="font-condensed font-extrabold text-lg sm:text-xl tabular-nums tracking-wider text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {fmtTime(elapsed)}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTimer}
          className="p-1.5 rounded-lg text-gray-500 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
          aria-label={running ? 'Pausar' : 'Iniciar'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          aria-label="Reiniciar"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}
