
/*

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


*/


import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

export function SessionTimer() {
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
    <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-gray-50 to-orange-50/40 dark:from-gray-800 dark:to-gray-800/90 border border-orange-100 dark:border-gray-700/80 px-3.5 py-2 shadow-sm transition-all">
      {/* Icono con indicador de estado (pulso si está activo) */}
      <div className="relative flex items-center justify-center p-2 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl">
        <Timer size={18} />
        {running && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
          </span>
        )}
      </div>

      {/* Tiempo con tipografía más marcada */}
      <span className="font-mono font-black text-lg sm:text-xl tracking-wider text-gray-900 dark:text-white tabular-nums">
        {fmtTime(elapsed)}
      </span>

      {/* Controles estéticos */}
      <div className="flex items-center gap-1 pl-1 border-l border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleTimer}
          className={`p-1.5 rounded-xl transition-all ${
            running 
              ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600' 
              : 'bg-orange-600 text-white shadow-sm hover:bg-orange-700'
          }`}
          aria-label={running ? 'Pausar' : 'Iniciar'}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-1.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          aria-label="Reiniciar"
        >
          <RotateCcw size={15} />
        </button>
      </div>
    </div>
  );
}