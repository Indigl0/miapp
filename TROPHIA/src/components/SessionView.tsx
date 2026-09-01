import { useState, useEffect } from 'react';
import { ListChecks, Plus, Check, Trash2, Play, Calendar, CheckCircle2, Clock, X, Save, RotateCcw } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid, now } from '@/lib/uuid';
import type { TrainingSession, Exercise, SessionExercise, SessionSet, Routine } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { Calendar as CalendarPicker } from '@/components/ui/Calendar';
import { SessionTimer } from '@/components/ui/SessionTimer';

function fmtDate(ts: number): string { return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }

export function SessionView({ activeSessionId, onActiveSessionChange }: { activeSessionId: string | null; onActiveSessionChange: (id: string | null) => void }) {
  // Obtenemos todas las sesiones y las separamos entre activas y papelera
  const allSessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray(), [], [] as TrainingSession[]);
  const sessions = allSessions.filter((s) => !(s as TrainingSession & { deletedAt?: number }).deletedAt);
  const trashSessions = allSessions.filter((s) => (s as TrainingSession & { deletedAt?: number }).deletedAt);

  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[]);
  const routines = useLiveQuery(() => db.routines.orderBy('name').toArray(), [], [] as Routine[]);
  const activeSession = useLiveQuery<TrainingSession | undefined>(
    () => (activeSessionId ? db.sessions.get(activeSessionId) : undefined),
    [activeSessionId],
    undefined,
  );
  
  const [createOpen, setCreateOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  // Estado local para las notas de la sesión activa (evita saltos de cursor)
  const [localNotes, setLocalNotes] = useState('');

  // Sincroniza el estado local de las notas cuando cambia la sesión activa
  useEffect(() => {
    setLocalNotes(activeSession?.notes ?? '');
  }, [activeSession?.id]);

  const exName = (id: string) => exercises.find((e) => e.id === id)?.name ?? 'Ejercicio eliminado';
  const totalVolume = (s: TrainingSession) => s.exercises.reduce((sum, ex) => sum + ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0), 0);
  const completedSets = (s: TrainingSession) => s.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.completed).length, 0);
  const totalSets = (s: TrainingSession) => s.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  const updateSession = async (s: TrainingSession) => {
    const updated = { ...s, updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'upsert', table: 'sessions', record: updated as unknown as Record<string, unknown> });
  };

  const toggleSet = async (s: TrainingSession, exIdx: number, setIdx: number) => {
    const exercisesCopy = s.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((set, j) => j === setIdx ? { ...set, completed: !set.completed } : set) });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const updateSet = async (s: TrainingSession, exIdx: number, setIdx: number, patch: Partial<SessionSet>) => {
    const exercisesCopy = s.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.map((set, j) => j === setIdx ? { ...set, ...patch } : set) });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const addSet = async (s: TrainingSession, exIdx: number) => {
    const exercisesCopy = s.exercises.map((ex, i) => {
      if (i !== exIdx) return ex;
      const nextNum = ex.sets.length + 1;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { setNumber: nextNum, reps: last?.reps ?? 10, weight: last?.weight ?? 0, completed: false }] };
    });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const removeSet = async (s: TrainingSession, exIdx: number, setIdx: number) => {
    const exercisesCopy = s.exercises.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== setIdx).map((set, j) => ({ ...set, setNumber: j + 1 })) });
    await updateSession({ ...s, exercises: exercisesCopy });
  };

  const updateDate = async (s: TrainingSession, newDate: number) => {
    await updateSession({ ...s, date: newDate });
  };

  const finishSession = async (s: TrainingSession) => { 
    // Asegurar guardar notas pendientes antes de finalizar
    await updateSession({ ...s, completed: true, notes: localNotes }); 
    onActiveSessionChange(null); 
  };

  // Enviar a la papelera (Soft Delete) en lugar de borrar directamente
  const moveToTrash = async (id: string) => {
    const target = allSessions.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, deletedAt: now(), updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'upsert', table: 'sessions', record: updated as unknown as Record<string, unknown> });
    if (activeSessionId === id) onActiveSessionChange(null);
  };

  // Restaurar sesión desde la papelera
  const restoreSession = async (id: string) => {
    const target = allSessions.find((s) => s.id === id);
    if (!target) return;
    const updated = { ...target, deletedAt: undefined, updatedAt: now() };
    await db.sessions.put(updated);
    await enqueue({ kind: 'upsert', table: 'sessions', record: updated as unknown as Record<string, unknown> });
  };

  // Eliminar permanentemente un registro de la base de datos
  const permanentDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente esta sesión? Esta acción no se puede deshacer.')) return;
    await db.sessions.delete(id);
    await enqueue({ kind: 'delete', table: 'sessions', id });
  };

  // Vaciar toda la papelera
  const emptyTrash = async () => {
    if (!confirm('¿Vaciar toda la papelera? Los elementos eliminados aquí no se podrán recuperar.')) return;
    for (const s of trashSessions) {
      await db.sessions.delete(s.id);
      await enqueue({ kind: 'delete', table: 'sessions', id: s.id });
    }
  };

  const createBlankSession = async (routineId?: string) => {
    let routineName = 'Sesión Libre';
    let sessionExercises: SessionExercise[] = [];
    if (routineId) {
      const r = routines.find((rt) => rt.id === routineId);
      if (r) {
        routineName = r.name;
        sessionExercises = r.exercises.map((re) => ({ exerciseId: re.exerciseId, sets: Array.from({ length: re.sets }, (_, i) => ({ setNumber: i + 1, reps: re.targetReps, weight: 0, completed: false })) }));
      }
    }
    const ts = now();
    const session: TrainingSession = { id: uuid(), routineId: routineId ?? null, routineName, date: ts, exercises: sessionExercises, completed: false, createdAt: ts, updatedAt: ts };
    await db.sessions.add(session);
    await enqueue({ kind: 'upsert', table: 'sessions', record: session as unknown as Record<string, unknown> });
    onActiveSessionChange(session.id);
    setCreateOpen(false);
  };

  if (activeSession) {
    const vol = totalVolume(activeSession);
    const done = completedSets(activeSession);
    const total = totalSets(activeSession);
    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge color={activeSession.completed ? 'green' : 'amber'}>{activeSession.completed ? <><CheckCircle2 size={12} />Completada</> : <><Clock size={12} />En progreso</>}</Badge>
            </div>
            <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight break-words">{activeSession.routineName}</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            {!activeSession.completed && <Button onClick={() => finishSession(activeSession)}><Check size={18} />Finalizar</Button>}
            <Button variant="outline" onClick={async () => {
              // Guardar notas al cerrar
              await updateSession({ ...activeSession, notes: localNotes });
              onActiveSessionChange(null);
            }}><X size={18} />Cerrar</Button>
          </div>
        </div>

        {/* Calendar + Timer row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CalendarPicker value={activeSession.date} onChange={(ts) => updateDate(activeSession, ts)} />
          <SessionTimer />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Card><CardBody className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{done}/{total}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Series</p></CardBody></Card>
          <Card><CardBody className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{vol.toFixed(0)}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Volumen kg</p></CardBody></Card>
          <Card><CardBody className="text-center py-3 sm:py-4"><p className="text-xl sm:text-2xl font-bold text-brand-500 break-words">{activeSession.exercises.length}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Ejercicios</p></CardBody></Card>
        </div>

        {/* Session Notes / Observations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">📝 Observaciones de la sesión</CardTitle>
          </CardHeader>
          <CardBody>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={async () => {
                // Guarda en la base de datos cuando el usuario hace clic fuera de la caja de texto
                await updateSession({ ...activeSession, notes: localNotes });
              }}
              placeholder="Ej. Me sentí con buena energía, descanso de 2 min entre series, molestia leve en el hombro..."
              className="w-full h-24 p-3 text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </CardBody>
        </Card>

        {/* Exercises with mobile-responsive sets */}
        <div className="space-y-4">
          {activeSession.exercises.map((ex, exIdx) => (
            <Card key={exIdx}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="break-words whitespace-normal leading-tight">{exName(ex.exerciseId)}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => addSet(activeSession, exIdx)} className="shrink-0"><Plus size={14} />Serie</Button>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                {/* Desktop: table layout */}
                <div className="hidden sm:block overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left px-4 py-2.5 font-semibold">#</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Reps</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Peso (kg)</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Volumen</th>
                        <th className="px-4 py-2.5"></th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ex.sets.map((set, setIdx) => (
                        <tr key={setIdx} className={`border-b border-gray-50 dark:border-gray-800/50 ${set.completed ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
                          <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{set.setNumber}</td>
                          <td className="px-4 py-2.5"><Input type="number" min={0} value={set.reps} onChange={(e) => updateSet(activeSession, exIdx, setIdx, { reps: Math.max(0, Number(e.target.value)) })} className="w-20 h-9 py-1.5" /></td>
                          <td className="px-4 py-2.5"><Input type="number" min={0} step={2.5} value={set.weight} onChange={(e) => updateSet(activeSession, exIdx, setIdx, { weight: Math.max(0, Number(e.target.value)) })} className="w-24 h-9 py-1.5" /></td>
                          <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{(set.reps * set.weight).toFixed(0)}</td>
                          <td className="px-4 py-2.5"><button onClick={() => toggleSet(activeSession, exIdx, setIdx)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-gray-600'}`}><Check size={16} /></button></td>
                          <td className="px-4 py-2.5"><button onClick={() => removeSet(activeSession, exIdx, setIdx)} className="p-1.5 text-gray-300 hover:text-red-500"><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: card-based layout */}
                <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} className={`p-3.5 space-y-2.5 ${set.completed ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-gray-400 break-words">Serie {set.setNumber}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSet(activeSession, exIdx, setIdx)} className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${set.completed ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}><Check size={16} /></button>
                          <button onClick={() => removeSet(activeSession, exIdx, setIdx)} className="p-1.5 text-gray-300 hover:text-red-500"><X size={14} /></button>
                        </div>
                      </div>
                      <div className="flex gap-2.5">
                        <div className="flex-1 min-w-0">
                          <Label>Reps</Label>
                          <Input type="number" min={0} value={set.reps} onChange={(e) => updateSet(activeSession, exIdx, setIdx, { reps: Math.max(0, Number(e.target.value)) })} className="h-10 text-base" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Label>Peso (kg)</Label>
                          <Input type="number" min={0} step={2.5} value={set.weight} onChange={(e) => updateSet(activeSession, exIdx, setIdx, { weight: Math.max(0, Number(e.target.value)) })} className="h-10 text-base" />
                        </div>
                        <div className="flex flex-col justify-end min-w-0">
                          <Label>Vol.</Label>
                          <div className="h-10 flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-400 break-words whitespace-nowrap">{(set.reps * set.weight).toFixed(0)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><ListChecks size={24} className="text-brand-500" />Sesión de Entrenamiento</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Inicia una rutina o crea una sesión libre.</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* Botón para abrir la papelera */}
          <Button variant="outline" onClick={() => setIsTrashOpen(true)}>
            <Trash2 size={18} /> Papelera ({trashSessions.length})
          </Button>
          <Button onClick={() => setCreateOpen(true)}><Plus size={18} />Nueva sesión</Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <Card><EmptyState icon={<ListChecks size={32} />} title="Sin sesiones" description="Inicia una rutina desde la pestaña Rutinas o crea una sesión libre aquí." action={<Button onClick={() => setCreateOpen(true)}><Plus size={18} />Nueva sesión</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words leading-tight">{s.routineName}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 flex-wrap">
                      <Calendar size={12} className="shrink-0" />
                      {fmtDate(s.date)}
                      
                      {/* Indicador de notas */}
                      {s.notes && (
                        <span className="inline-flex items-center gap-1 text-brand-500 bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 rounded text-[10px] font-medium">
                          📝 Con notas
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge color={s.completed ? 'green' : 'amber'}>{s.completed ? 'Completada' : 'En progreso'}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 break-words"><span>{completedSets(s)}/{totalSets(s)} series</span><span>{totalVolume(s).toFixed(0)} kg vol.</span></div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => onActiveSessionChange(s.id)} className="flex-1"><Play size={14} />Abrir</Button>
                  <Button size="sm" variant="danger" onClick={() => moveToTrash(s.id)}><Trash2 size={14} /></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Creación */}
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

      {/* Modal de la Papelera de Reciclaje */}
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
                  <p className="text-xs text-gray-400">{fmtDate(s.date)} • {completedSets(s)}/{totalSets(s)} series</p>
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
  );
}

