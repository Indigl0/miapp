import { useState, useEffect, useRef } from 'react';
import { ListChecks, Plus, Check, Trash2, Play, Calendar, CheckCircle2, Clock, X, Save, RotateCcw, Activity, ChevronDown, BellRing, History } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid, now } from '@/lib/uuid';
import type { TrainingSession, Exercise, SessionExercise, SessionSet, Routine } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Calendar as CalendarPicker } from '@/components/ui/Calendar';

function fmtDate(ts: number): string { 
  if (!ts) return 'Sin fecha';
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); 
}

function formatRestTime(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0 && secs > 0) return `${mins} min ${secs} s`;
  if (mins > 0) return `${mins} min`;
  return `${secs} s`;
}

// Obtener el ID del usuario actual de la sesión local
function getCurrentUserId(): string | null {
  try {
    const stored = localStorage.getItem('ironlog-session');
    if (!stored) return null;
    const { id } = JSON.parse(stored) as { id: string };
    return id ?? null;
  } catch {
    return null;
  }
}

// AudioContext global reutilizable
let globalAudioCtx: AudioContext | null = null;

function unlockAudioContext() {
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      globalAudioCtx = new AudioCtxClass();
    }
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  } catch (e) {
    console.error('AudioContext unlock error:', e);
  }
}

function playTimerBeep() {
  try {
    unlockAudioContext();
    if (!globalAudioCtx) return;

    const ctx = globalAudioCtx;
    const nowTime = ctx.currentTime;

    const playChord = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, nowTime + delay);
      
      gain.gain.setValueAtTime(0.4, nowTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, nowTime + delay + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(nowTime + delay);
      osc.stop(nowTime + delay + duration);
    };

    playChord(523.25, 0, 0.25);
    playChord(659.25, 0.15, 0.25);
    playChord(783.99, 0.30, 0.6);

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 100, 300, 100, 500]);
    }
  } catch (e) {
    console.error('Audio feedback error:', e);
  }
}

export function SessionView({ activeSessionId, onActiveSessionChange }: { activeSessionId: string | null; onActiveSessionChange: (id: string | null) => void }) {
  const currentUserId = getCurrentUserId();

  // Consulta filtrada estrictamente por el userId activo
  const rawSessions = useLiveQuery(async () => {
    if (!currentUserId) return [];
    const list = await db.sessions.where('userId').equals(currentUserId).toArray();
    return list.sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [currentUserId], [] as TrainingSession[]);
  
  const allSessions = rawSessions.map((s) => ({
    ...s,
    exercises: (s.exercises || []).map((ex) => ({
      ...ex,
      sets: ex.sets ? ex.sets.map((st) => ({
        ...st,
        reps: st.reps ?? 0,
        weight: st.weight ?? 0,
        completed: !!st.completed,
        rir: st.rir !== undefined ? st.rir : undefined,
      })) : undefined,
    })),
  }));

  const sessions = allSessions.filter((s) => !(s as TrainingSession & { deletedAt?: number }).deletedAt);
  const trashSessions = allSessions.filter((s) => (s as TrainingSession & { deletedAt?: number }).deletedAt);

  // Consultas de Ejercicios y Rutinas aisladas por el usuario actual (o generales si no poseen userId)
  const exercises = useLiveQuery(async () => {
    if (!currentUserId) return [];
    const all = await db.exercises.toArray();
    return all
      .filter((e) => !e.userId || e.userId === currentUserId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentUserId], [] as Exercise[]);

  const routines = useLiveQuery(async () => {
    if (!currentUserId) return [];
    return db.routines.where('userId').equals(currentUserId).sortBy('name');
  }, [currentUserId], [] as Routine[]);

  const activeSessionRaw = useLiveQuery<TrainingSession | undefined>(
    () => (activeSessionId ? db.sessions.get(activeSessionId) : undefined),
    [activeSessionId],
    undefined,
  );

  const activeSession: TrainingSession | undefined = activeSessionRaw ? {
    ...activeSessionRaw,
    exercises: (activeSessionRaw.exercises || []).map((ex) => ({
      ...ex,
      sets: ex.sets ? ex.sets.map((st) => ({
        ...st,
        reps: st.reps ?? 0,
        weight: st.weight ?? 0,
        completed: !!st.completed,
        rir: st.rir !== undefined ? st.rir : undefined,
      })) : undefined,
    })),
  } : undefined;

  const currentRoutine = routines.find((r) => r.id === activeSession?.routineId);

  const [createOpen, setCreateOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [localNotes, setLocalNotes] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [restRemaining, setRestRemaining] = useState<number>(0);
  const [isTimerFinished, setIsTimerFinished] = useState<boolean>(false);
  const [screenFlash, setScreenFlash] = useState<boolean>(false);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const triggerScreenFlash = () => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 200);
    setTimeout(() => setScreenFlash(true), 400);
    setTimeout(() => setScreenFlash(false), 600);
    setTimeout(() => setScreenFlash(true), 800);
    setTimeout(() => setScreenFlash(false), 1000);
  };

  const startRestTimer = (seconds: number) => {
    unlockAudioContext();
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setIsTimerFinished(false);
    setActiveRestSeconds(seconds);
    setRestRemaining(seconds);

    restTimerRef.current = setInterval(() => {
      setRestRemaining((prev) => {
        if (prev <= 1) {
          if (restTimerRef.current) clearInterval(restTimerRef.current);
          playTimerBeep();
          triggerScreenFlash();
          setIsTimerFinished(true);
          
          setTimeout(() => {
            setActiveRestSeconds(null);
            setIsTimerFinished(false);
          }, 5000);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelRestTimer = () => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setActiveRestSeconds(null);
    setIsTimerFinished(false);
  };

  useEffect(() => {
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [distanceInputs, setDistanceInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setLocalNotes(activeSession?.notes ?? '');
  }, [activeSession?.id]);

  const getExercise = (id: string) => exercises.find((e) => e.id === id);
  const exName = (id: string) => getExercise(id)?.name ?? 'Ejercicio eliminado';
  const isCardio = (id: string) => getExercise(id)?.muscleGroup?.toLowerCase() === 'cardio';

  const getPreviousSetsForExercise = (exerciseId: string): SessionSet[] | null => {
    if (!activeSession) return null;
    const completedPastSessions = sessions.filter((s) => s.completed && s.id !== activeSession.id);
    for (const pastSession of completedPastSessions) {
      const match = pastSession.exercises?.find((ex) => ex.exerciseId === exerciseId);
      if (match && match.sets && match.sets.length > 0) {
        return match.sets;
      }
    }
    return null;
  };

  const totalVolume = (s: TrainingSession) =>
    (s.exercises || []).reduce((sum, ex) => sum + (ex.sets ? ex.sets.reduce((a, set) => a + (set.completed ? (set.reps || 0) * (set.weight || 0) : 0), 0) : 0), 0);

  const completedSets = (s: TrainingSession) =>
    (s.exercises || []).reduce((sum, ex) => {
      if (ex.cardioDetails) return sum + (ex.cardioDetails.completed ? 1 : 0);
      return sum + (ex.sets ? ex.sets.filter((set) => set.completed).length : 0);
    }, 0);

  const totalSets = (s: TrainingSession) =>
    (s.exercises || []).reduce((sum, ex) => {
      if (ex.cardioDetails) return sum + 1;
      return sum + (ex.sets ? ex.sets.length : 0);
    }, 0);

  const updateSession = async (s: TrainingSession) => {
    const updated = { ...s, userId: s.userId || currentUserId || '', updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'upsert', table: 'sessions', record: updated as unknown as Record<string, unknown> });
  };

  const toggleSet = async (s: TrainingSession, exIdx: number, setIdx: number) => {
    unlockAudioContext();
    const isNowCompleted = !s.exercises[exIdx]?.sets?.[setIdx]?.completed;
    const exercisesCopy = s.exercises.map((ex, i) =>
      i !== exIdx || !ex.sets ? ex : { ...ex, sets: ex.sets.map((set, j) => (j === setIdx ? { ...set, completed: !set.completed } : set)) }
    );
    await updateSession({ ...s, exercises: exercisesCopy });

    if (isNowCompleted) {
      const routineEx = currentRoutine?.exercises.find((re) => re.exerciseId === s.exercises[exIdx].exerciseId);
      if (routineEx?.restSeconds) {
        startRestTimer(routineEx.restSeconds);
      }
    }
  };

  const updateSet = async (s: TrainingSession, exIdx: number, setIdx: number, patch: Partial<SessionSet>) => {
    const exercisesCopy = s.exercises.map((ex, i) =>
      i !== exIdx || !ex.sets ? ex : { ...ex, sets: ex.sets.map((set, j) => (j === setIdx ? { ...set, ...patch } : set)) }
    );
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const addSet = async (s: TrainingSession, exIdx: number) => {
    const exercisesCopy = s.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const currentSets = ex.sets || [];
      const nextNum = currentSets.length + 1;
      const last = currentSets[currentSets.length - 1];
      return { 
        ...ex, 
        sets: [...currentSets, { setNumber: nextNum, reps: last?.reps ?? 10, weight: last?.weight ?? 0, rir: last?.rir ?? 2, completed: false }] 
      };
    });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const removeSet = async (s: TrainingSession, exIdx: number, setIdx: number) => {
    const exercisesCopy = s.exercises.map((ex, i) =>
      i !== exIdx || !ex.sets ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx).map((set, j) => ({ ...set, setNumber: j + 1 })) }
    );
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const updateCardioDetails = async (s: TrainingSession, exIdx: number, patch: Partial<NonNullable<SessionExercise['cardioDetails']>>) => {
    const exercisesCopy = s.exercises.map((ex, i) => {
      if (i !== exIdx || !ex.cardioDetails) return ex;
      return { ...ex, cardioDetails: { ...ex.cardioDetails, ...patch } };
    });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const updateDate = async (s: TrainingSession, newDate: number) => {
    await updateSession({ ...s, date: newDate });
  };

  const finishSession = async (s: TrainingSession) => { 
    const filteredExercises = (s.exercises || []).filter((ex) => {
      if (ex.cardioDetails) {
        return ex.cardioDetails.completed === true;
      }
      return true;
    });

    await updateSession({ ...s, exercises: filteredExercises, completed: true, notes: localNotes }); 
    showToast('🎉 Sesión finalizada y guardada con éxito.');
    onActiveSessionChange(null); 
  };

  const moveToTrash = async (id: string) => {
    const target = allSessions.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, deletedAt: now(), updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'delete', table: 'sessions', id });
    showToast('Sesión movida a la papelera');
    if (activeSessionId === id) onActiveSessionChange(null);
  };

  const restoreSession = async (id: string) => {
    const target = allSessions.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, deletedAt: undefined, updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'upsert', table: 'sessions', record: updated as unknown as Record<string, unknown> });
    showToast('Sesión restaurada correctamente');
  };

  const permanentDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente esta sesión? Esta acción no se puede deshacer.')) return;
    await db.sessions.delete(id);
    await enqueue({ kind: 'delete', table: 'sessions', id });
    showToast('Sesión eliminada permanentemente');
  };

  const emptyTrash = async () => {
    if (!confirm('¿Vaciar toda la papelera? Los elementos eliminados aquí no se podrán recuperar.')) return;
    for (const s of trashSessions) {
      await db.sessions.delete(s.id);
      await enqueue({ kind: 'delete', table: 'sessions', id: s.id });
    }
    showToast('Papelera vaciada correctamente');
  };

  const createBlankSession = async (routineId?: string) => {
    if (!currentUserId) {
      showToast('Error: No hay sesión de usuario activa.');
      return;
    }

    let routineName = 'Sesión Libre';
    let sessionExercises: SessionExercise[] = [];

    const lastSessionWithRoutine = routineId 
      ? sessions.find((s) => s.routineId === routineId && s.completed)
      : null;

    if (routineId) {
      const r = routines.find((rt) => rt.id === routineId);
      if (r) {
        routineName = r.name;
        sessionExercises = r.exercises.map((re) => {
          const lastExMatch = lastSessionWithRoutine?.exercises.find(
            (ex) => ex.exerciseId === re.exerciseId
          );

          if (isCardio(re.exerciseId)) {
            return {
              exerciseId: re.exerciseId,
              cardioDetails: {
                cardioType: lastExMatch?.cardioDetails?.cardioType ?? re.cardioType ?? 'Cinta',
                durationMinutes: lastExMatch?.cardioDetails?.durationMinutes ?? re.durationMinutes ?? 30,
                distanceKm: lastExMatch?.cardioDetails?.distanceKm,
                completed: false,
              },
            };
          }

          if (lastExMatch && lastExMatch.sets && lastExMatch.sets.length > 0) {
            return {
              exerciseId: re.exerciseId,
              sets: lastExMatch.sets.map((st, i) => ({
                setNumber: i + 1,
                reps: st.reps ?? 10,
                weight: st.weight ?? 0,
                rir: st.rir !== undefined ? st.rir : 2,
                completed: false,
              })),
            };
          }

          return {
            exerciseId: re.exerciseId,
            sets: Array.from({ length: re.sets ?? 3 }, (_, i) => ({ 
              setNumber: i + 1, 
              reps: re.targetReps ?? 10, 
              weight: 0, 
              rir: 2, 
              completed: false 
            })),
          };
        });
      }
    }

    const ts = now();
    const session: TrainingSession = { 
      id: uuid(), 
      userId: currentUserId, 
      routineId: routineId ?? null, 
      routineName, 
      date: ts, 
      exercises: sessionExercises, 
      completed: false, 
      createdAt: ts, 
      updatedAt: ts 
    };

    await db.sessions.add(session);
    await enqueue({ kind: 'upsert', table: 'sessions', record: session as unknown as Record<string, unknown> });
    onActiveSessionChange(session.id);
    setCreateOpen(false);
  };

  // Manejo seguro del peso, filtrando cualquier carácter inválido
  const handleWeightInputChange = (s: TrainingSession, exIdx: number, setIdx: number, rawVal: string) => {
    const key = `${exIdx}-${setIdx}`;
    
    const cleanVal = rawVal.replace(/[^0-9.,]/g, '');
    const sanitized = cleanVal.replace(',', '.');
    
    if (sanitized === '' || /^\d*\.?\d*$/.test(sanitized)) {
      setWeightInputs((prev) => ({ ...prev, [key]: cleanVal }));
      const parsed = parseFloat(sanitized);
      updateSet(s, exIdx, setIdx, { weight: isNaN(parsed) ? 0 : parsed });
    }
  };

  // Manejo seguro de distancia para el cardio
  const handleDistanceInputChange = (s: TrainingSession, exIdx: number, rawVal: string) => {
    const key = `cardio-${exIdx}`;
    const cleanVal = rawVal.replace(/[^0-9.,]/g, '');
    const sanitized = cleanVal.replace(',', '.');

    if (sanitized === '' || /^\d*\.?\d*$/.test(sanitized)) {
      setDistanceInputs((prev) => ({ ...prev, [key]: cleanVal }));
      const parsed = parseFloat(sanitized);
      updateCardioDetails(s, exIdx, { distanceKm: isNaN(parsed) ? undefined : parsed });
    }
  };

  return (
    <>
      {screenFlash && (
        <div className="fixed inset-0 z-[100] bg-white opacity-90 transition-opacity duration-100 pointer-events-none" />
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {activeRestSeconds !== null && (
        <div 
          className={`fixed bottom-6 left-6 z-50 px-5 py-4 sm:px-6 sm:py-5 rounded-3xl shadow-2xl flex items-center gap-4 transition-all duration-300 border-2 ${
            isTimerFinished 
              ? 'bg-emerald-600 border-emerald-400 text-white animate-bounce ring-4 ring-emerald-300/50' 
              : 'bg-brand-500 border-brand-400 text-white animate-pulse'
          }`}
        >
          {isTimerFinished ? (
            <BellRing size={28} className="animate-spin text-white shrink-0" />
          ) : (
            <Clock size={28} className="shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          )}

          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-wider opacity-90">
              {isTimerFinished ? '¡A ENTRENAR!' : 'DESCANSO ACTIVO'}
            </span>
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight leading-none mt-0.5">
              {isTimerFinished 
                ? '00:00' 
                : `${Math.floor(restRemaining / 60)}:${(restRemaining % 60).toString().padStart(2, '0')}`
              }
            </span>
          </div>

          <button 
            onClick={cancelRestTimer} 
            className="ml-2 bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-2xl transition-colors shrink-0"
            title="Cerrar temporizador"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {activeSession ? (
        (() => {
          const vol = totalVolume(activeSession);
          const done = completedSets(activeSession);
          const total = totalSets(activeSession);
          return (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={activeSession.completed ? 'green' : 'amber'}>
                      {activeSession.completed ? <><CheckCircle2 size={12} />Completada</> : <><Clock size={12} />En progreso</>}
                    </Badge>
                  </div>
                  <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight break-words">{activeSession.routineName}</h2>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!activeSession.completed && <Button onClick={() => finishSession(activeSession)}><Check size={18} />Finalizar</Button>}
                  <Button variant="outline" onClick={async () => {
                    await updateSession({ ...activeSession, notes: localNotes });
                    onActiveSessionChange(null);
                  }}><X size={18} />Cerrar</Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CalendarPicker value={activeSession.date} onChange={(ts) => updateDate(activeSession, ts)} />
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Card><CardBody><div className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{done}/{total}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Bloques</p></div></CardBody></Card>
                <Card><CardBody><div className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{vol.toFixed(1)}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Volumen kg</p></div></CardBody></Card>
                <Card><CardBody><div className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{activeSession.exercises.length}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Ejercicios</p></div></CardBody></Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">📝 Observaciones de la sesión</CardTitle>
                </CardHeader>
                <CardBody>
                  <textarea
                    value={localNotes}
                    onChange={(e) => setLocalNotes(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={async () => {
                      await updateSession({ ...activeSession, notes: localNotes });
                    }}
                    placeholder="Ej. Me sentí con buena energía, descanso de 2 min entre series..."
                    className="w-full h-24 p-3 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  />
                </CardBody>
              </Card>

              <div className="space-y-4">
                {activeSession.exercises.map((ex, exIdx) => {
                  const isExCardio = isCardio(ex.exerciseId) || !!ex.cardioDetails;
                  const cardioData = ex.cardioDetails ?? { cardioType: 'Cinta', durationMinutes: 30, completed: false };

                  const routineEx = currentRoutine?.exercises.find((re) => re.exerciseId === ex.exerciseId);
                  const formattedRest = formatRestTime(routineEx?.restSeconds);

                  const distanceKey = `cardio-${exIdx}`;
                  const displayDistance = distanceInputs[distanceKey] ?? (cardioData.distanceKm !== undefined ? String(cardioData.distanceKm) : '');

                  const prevSets = !isExCardio ? getPreviousSetsForExercise(ex.exerciseId) : null;

                  return (
                    <Card key={exIdx}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <CardTitle className="break-words whitespace-normal leading-tight flex items-center gap-2">
                              {isExCardio && <Activity size={18} className="text-blue-500 shrink-0" />}
                              {exName(ex.exerciseId)}
                            </CardTitle>
                            
                            {formattedRest && (
                              <button
                                onClick={() => routineEx?.restSeconds && startRestTimer(routineEx.restSeconds)}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 shrink-0 transition-colors cursor-pointer"
                                title="Hacer clic para iniciar cronómetro de descanso"
                              >
                                <Clock size={12} className="shrink-0" />
                                Descanso: {formattedRest}
                              </button>
                            )}
                          </div>

                          {!isExCardio && (
                            <Button size="sm" variant="ghost" onClick={() => addSet(activeSession, exIdx)} className="shrink-0"><Plus size={14} />Serie</Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className={isExCardio ? 'p-4' : 'p-0'}>
                          {isExCardio ? (
                            <div className="flex flex-col sm:flex-row sm:items-end gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                              <div className="flex-1">
                                <Label>Tipo de Cardio</Label>
                                <Select
                                  value={cardioData.cardioType}
                                  onChange={(e) => updateCardioDetails(activeSession, exIdx, { cardioType: e.target.value })}
                                >
                                  <option value="Cinta">Cinta / Trote</option>
                                  <option value="Bicicleta">Bicicleta</option>
                                  <option value="Elíptica">Elíptica</option>
                                  <option value="Caminata">Caminata</option>
                                  <option value="Remo">Remo</option>
                                  <option value="Otro">Otro</option>
                                </Select>
                              </div>

                              <div className="w-full sm:w-32">
                                <Label>Tiempo (min)</Label>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={cardioData.durationMinutes || ''}
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                                    updateCardioDetails(activeSession, exIdx, { durationMinutes: Math.max(0, parseInt(cleanVal) || 0) });
                                  }}
                                />
                              </div>

                              <div className="w-full sm:w-32">
                                <Label>Distancia (km)</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0.0"
                                  value={displayDistance}
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => handleDistanceInputChange(activeSession, exIdx, e.target.value)}
                                />
                              </div>

                              <button
                                onClick={() => updateCardioDetails(activeSession, exIdx, { completed: !cardioData.completed })}
                                className={`h-10 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-colors cursor-pointer ${
                                  cardioData.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                }`}
                              >
                                <Check size={16} />
                                {cardioData.completed ? 'Completado' : 'Marcar'}
                              </button>
                            </div>
                          ) : (
                            <div className="overflow-x-auto scrollbar-thin -mx-4 sm:mx-0 px-2 sm:px-0">
                              <table className="w-full text-xs sm:text-sm min-w-[340px] table-fixed">
                                <thead>
                                  <tr className="text-[10px] sm:text-[11px] uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
                                    <th className="text-center px-1 py-2 font-semibold w-8">#</th>
                                    <th className="text-center px-1 py-2 font-semibold w-[64px]">Reps</th>
                                    <th className="text-center px-1 py-2 font-semibold w-[64px]">Peso</th>
                                    <th className="text-center px-1 py-2 font-semibold w-[90px]">RIR</th>
                                    <th className="text-center px-1 py-2 font-semibold w-10">Vol</th>
                                    <th className="px-1 py-2 w-8"></th>
                                    <th className="px-1 py-2 w-8"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ex.sets?.map((set, setIdx) => {
                                    const key = `${exIdx}-${setIdx}`;
                                    const displayWeight = weightInputs[key] ?? (set.weight ? String(set.weight) : '');
                                    const prevSet = prevSets?.[setIdx];

                                    return (
                                      <tr key={setIdx} className={`border-b border-gray-50 dark:border-gray-800/50 ${set.completed ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
                                        <td className="px-1 py-2.5 whitespace-nowrap align-middle text-center">
                                          <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{set.setNumber}</div>
                                        </td>

                                        {/* Columna Reps con micro-etiqueta sutil */}
                                        <td className="px-1 py-2.5 text-center align-middle">
                                          <div className="flex flex-col items-center justify-center">
                                            <Input
                                              type="text"
                                              inputMode="numeric"
                                              value={set.reps || ''}
                                              placeholder={prevSet ? String(prevSet.reps) : "0"}
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => {
                                                const cleanVal = e.target.value.replace(/[^0-9]/g, '');
                                                updateSet(activeSession, exIdx, setIdx, { reps: cleanVal === '' ? 0 : parseInt(cleanVal, 10) });
                                              }}
                                              className="w-[56px] min-w-[56px] h-9 text-center text-sm font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600 block !px-1"
                                            />
                                            {prevSet && prevSet.reps !== undefined && (
                                              <span className="text-[9px] text-gray-400 leading-none mt-1 font-mono">
                                                prev: {prevSet.reps}
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        {/* Columna Peso con micro-etiqueta sutil */}
                                        <td className="px-1 py-2.5 text-center align-middle">
                                          <div className="flex flex-col items-center justify-center">
                                            <Input
                                              type="text"
                                              inputMode="decimal"
                                              value={displayWeight}
                                              placeholder={prevSet ? String(prevSet.weight) : "0"}
                                              onFocus={(e) => e.target.select()}
                                              onChange={(e) => handleWeightInputChange(activeSession, exIdx, setIdx, e.target.value)}
                                              className="w-[60px] min-w-[60px] h-9 text-center text-sm font-medium placeholder:text-gray-300 dark:placeholder:text-gray-600 block !px-1"
                                            />
                                            {prevSet && prevSet.weight !== undefined && (
                                              <span className="text-[9px] text-gray-400 leading-none mt-1 font-mono">
                                                prev: {prevSet.weight}
                                              </span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="px-1 py-2.5 align-middle">
                                          <div className="flex justify-center gap-0.5 min-w-[80px]">
                                            {[0, 1, 2, 3].map((val) => (
                                              <button
                                                key={val}
                                                type="button"
                                                onClick={() => updateSet(activeSession, exIdx, setIdx, { rir: set.rir === val ? undefined : val })}
                                                className={`px-1.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                                                  set.rir === val
                                                    ? 'bg-brand-500 text-white border-brand-500'
                                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:border-brand-300'
                                                }`}
                                              >
                                                {val === 3 ? '3+' : val}
                                              </button>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="px-1 py-2.5 text-center align-middle text-xs text-gray-500 dark:text-gray-400">
                                          {((set.reps || 0) * (set.weight || 0)).toFixed(0)}
                                        </td>
                                        <td className="px-1 py-2.5 text-center align-middle">
                                          <button onClick={() => toggleSet(activeSession, exIdx, setIdx)} className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600'}`}>
                                            <Check size={14} />
                                          </button>
                                        </td>
                                        <td className="px-1 py-2.5 text-center align-middle">
                                          <button onClick={() => removeSet(activeSession, exIdx, setIdx)} className="p-1 mx-auto text-gray-300 hover:text-red-500 flex justify-center">
                                            <X size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><ListChecks size={24} className="text-brand-500" />Sesión de Entrenamiento</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Inicia una rutina o crea una sesión libre.</p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap">
              <Button variant="outline" onClick={() => setIsTrashOpen(true)}>
                <Trash2 size={18} /> Papelera ({trashSessions.length})
              </Button>
              <Button onClick={() => setCreateOpen(true)}><Plus size={18} />Nueva sesión</Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <Card><EmptyState icon={<ListChecks size={32} />} title="Sin sesiones" description="Inicia una rutina desde la pestaña Rutinas o crea una sesión libre aquí." action={<Button onClick={() => setCreateOpen(true)}><Plus size={18} />Nueva sesión</Button>} /></Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sessions.slice(0, visibleCount).map((s) => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardBody>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold break-words leading-tight">{s.routineName}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 flex-wrap">
                              <Calendar size={12} className="shrink-0" />
                              {fmtDate(s.date)}
                              {s.notes && (
                                <span className="inline-flex items-center gap-1 text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                  📝 Con notas
                                </span>
                              )}
                            </p>
                          </div>
                          <Badge color={s.completed ? 'green' : 'amber'}>{s.completed ? 'Completada' : 'En progreso'}</Badge>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 break-words">
                          <span>{completedSets(s)}/{totalSets(s)} bloques</span>
                          <span>{totalVolume(s).toFixed(1)} kg vol.</span>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" onClick={() => onActiveSessionChange(s.id)} className="flex-1"><Play size={14} />Abrir</Button>
                          <Button size="sm" variant="danger" onClick={() => moveToTrash(s.id)}><Trash2 size={14} /></Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {visibleCount < sessions.length && (
                <div className="text-center pt-2">
                  <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + 6)}>
                    <ChevronDown size={16} className="mr-1" />
                    Cargar más sesiones ({sessions.length - visibleCount} restantes)
                  </Button>
                </div>
              )}
            </>
          )}

          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva sesión"
            footer={<><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={() => createBlankSession()}><Save size={16} />Crear libre</Button></>}>
            <div className="space-y-4">
              <div>
                <Label>Iniciar desde rutina</Label>
                <div className="grid gap-2">
                  {routines.length === 0 ? <p className="text-sm text-gray-400 break-words">No hay rutinas creadas aún.</p> : routines.map((r) => (
                    <button key={r.id} onClick={() => createBlankSession(r.id)} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/5 transition-colors text-left">
                      <div className="min-w-0"><p className="font-semibold break-words">{r.name}</p><p className="text-xs text-gray-400 break-words">{r.exercises.length} ejercicios</p></div>
                      <Play size={16} className="text-brand-500 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800"><p className="text-xs text-gray-400 text-center break-words">O crea una sesión en blanco sin plantilla.</p></div>
            </div>
          </Modal>

          <Modal open={isTrashOpen} onClose={() => setIsTrashOpen(false)} title="Papelera de Reciclaje"
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsTrashOpen(false)}>Cerrar</Button>
                {trashSessions.length > 0 && (
                  <Button variant="danger" onClick={emptyTrash}>Vaciar papelera</Button>
                )}
              </>
            }>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {trashSessions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">La papelera está vacía.</p>
              ) : (
                trashSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{s.routineName}</p>
                      <p className="text-xs text-gray-400">{fmtDate(s.date)} • {completedSets(s)}/{totalSets(s)} bloques</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => restoreSession(s.id)}>
                        <RotateCcw size={14} className="mr-1" /> Restaurar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => permanentDelete(s.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Modal>
        </div>
      )}
    </>
  );
}
