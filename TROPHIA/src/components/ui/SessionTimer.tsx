import { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface SessionTimerProps {
  startTime?: number;
}

export function SessionTimer({ startTime }: SessionTimerProps) {
  const STORAGE_START_KEY = 'trophia_persistent_session_start';
  const STORAGE_RUNNING_KEY = 'trophia_persistent_timer_running';
  const STORAGE_PAUSED_KEY = 'trophia_persistent_paused_elapsed';

  // 1. Inicializar el tiempo de inicio una sola vez y bloquearlo para evitar reseteos por props
  const [effectiveStart] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_START_KEY);
    if (stored) return Number(stored);
    const initial = startTime || Date.now();
    localStorage.setItem(STORAGE_START_KEY, initial.toString());
    return initial;
  });

  // 2. Estado de ejecución persistido
  const [running, setRunning] = useState<boolean>(() => {
    const storedRunning = localStorage.getItem(STORAGE_RUNNING_KEY);
    return storedRunning !== null ? storedRunning === 'true' : true;
  });

  // 3. Tiempo pausado persistido
  const [pausedElapsed, setPausedElapsed] = useState<number | null>(() => {
    const storedRunning = localStorage.getItem(STORAGE_RUNNING_KEY);
    if (storedRunning === 'false') {
      const storedElapsed = localStorage.getItem(STORAGE_PAUSED_KEY);
      if (storedElapsed) return Number(storedElapsed);
    }
    return null;
  });

  const [elapsed, setElapsed] = useState<number>(() => {
    return Math.max(0, Math.floor((Date.now() - effectiveStart) / 1000));
  });

  // Guardar estado running cuando cambie
  useEffect(() => {
    localStorage.setItem(STORAGE_RUNNING_KEY, running.toString());
  }, [running]);

  // Intervalo del cronómetro en vivo
  useEffect(() => {
    if (!running) return;

    const updateTimer = () => {
      const currentElapsed = Math.max(0, Math.floor((Date.now() - effectiveStart) / 1000));
      setElapsed(currentElapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [running, effectiveStart]);

  const fmtTime = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const toggleTimer = () => {
    if (running) {
      const currentDisplay = pausedElapsed !== null ? pausedElapsed : elapsed;
      setPausedElapsed(currentDisplay);
      localStorage.setItem(STORAGE_PAUSED_KEY, currentDisplay.toString());
      setRunning(false);
      localStorage.setItem(STORAGE_RUNNING_KEY, 'false');
    } else {
      const currentPaused = pausedElapsed !== null ? pausedElapsed : 0;
      const newStart = Date.now() - (currentPaused * 1000);
      localStorage.setItem(STORAGE_START_KEY, newStart.toString());
      setRunning(true);
      setPausedElapsed(null);
      localStorage.removeItem(STORAGE_PAUSED_KEY);
      localStorage.setItem(STORAGE_RUNNING_KEY, 'true');
      setElapsed(currentPaused);
    }
  };

  const resetTimer = () => {
    const now = Date.now();
    localStorage.setItem(STORAGE_START_KEY, now.toString());
    localStorage.setItem(STORAGE_RUNNING_KEY, 'true');
    localStorage.removeItem(STORAGE_PAUSED_KEY);
    setElapsed(0);
    setPausedElapsed(null);
    setRunning(true);
  };

  const currentDisplayTime = pausedElapsed !== null ? pausedElapsed : elapsed;

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/80 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
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

      <div className="text-center my-1 sm:my-0">
        <span className="font-sans font-black text-4xl sm:text-5xl tracking-tight text-orange-600 dark:text-orange-500 tabular-nums">
          {fmtTime(currentDisplayTime)}
        </span>
      </div>

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
          onClick= {resetTimer}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl transition"
          title="Reiniciar cronómetro"
          aria-label="Reiniciar cronómetro"
        >
          <RotateCcw size={18} />
        </button>
      </div>
    </div>
  );
}
