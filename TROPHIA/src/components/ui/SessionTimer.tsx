
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
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
      {/* Lado izquierdo: Icono y etiqueta descriptiva */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center p-3 bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-2xl">
          <Timer size={26} />
          {running && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          )}
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 block">Tiempo de Sesión</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Cronómetro en vivo</span>
        </div>
      </div>

      {/* Centro: Números limpios y claros sin ceros tachados */}
      <div className="text-center my-1 sm:my-0">
        <span className="font-sans font-black text-4xl sm:text-5xl tracking-tight text-orange-600 dark:text-orange-500 tabular-nums">
          {fmtTime(elapsed)}
        </span>
      </div>

      {/* Lado derecho: Controles grandes y cómodos */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
        <button
          onClick={toggleTimer}
          className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl transition-all font-semibold flex items-center justify-center gap-2 text-white shadow-sm ${
            running 
              ? 'bg-amber-500 hover:bg-amber-600' 
              : 'bg-orange-600 hover:bg-orange-700'
          }`}
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
          <span>{running ? 'Pausar' : 'Iniciar'}</span>
        </button>
        <button
          onClick={resetTimer}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition"
          title="Reiniciar"
          aria-label="Reiniciar"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}