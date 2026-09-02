import { useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, Play, X } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid, now } from '@/lib/uuid';
import type { Routine, RoutineExercise, Exercise, TrainingSession, SessionExercise } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

interface FormState { name: string; description: string; exercises: RoutineExercise[]; }
const empty: FormState = { name: '', description: '', exercises: [] };

export function RoutinesView({ onStartSession }: { onStartSession: (sessionId: string) => void }) {
  const routines = useLiveQuery(() => db.routines.orderBy('updatedAt').reverse().toArray(), [], [] as Routine[]);
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const getExercise = (id: string) => exercises.find((e) => e.id === id);
  const exName = (id: string) => getExercise(id)?.name ?? 'Ejercicio eliminado';
  const isCardio = (id: string) => getExercise(id)?.muscleGroup?.toLowerCase() === 'cardio';

  const openCreate = () => { setEditing(null); setForm(empty); setModalOpen(true); };
  const openEdit = (r: Routine) => { setEditing(r); setForm({ name: r.name, description: r.description ?? '', exercises: r.exercises }); setModalOpen(true); };

  const addExercise = () => {
    if (exercises.length === 0) return;
    const firstEx = exercises[0];
    const isFirstCardio = firstEx.muscleGroup?.toLowerCase() === 'cardio';

    const newExercise: RoutineExercise = isFirstCardio
      ? { exerciseId: firstEx.id, cardioType: 'Cinta', durationMinutes: 30 }
      : { exerciseId: firstEx.id, sets: 3, targetReps: 10, restSeconds: 90 };

    setForm((f) => ({ ...f, exercises: [...f.exercises, newExercise] }));
  };

  const handleExerciseChange = (idx: number, newExerciseId: string) => {
    const cardio = isCardio(newExerciseId);
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e, i) => {
        if (i !== idx) return e;
        return cardio
          ? { exerciseId: newExerciseId, cardioType: 'Cinta', durationMinutes: 30 }
          : { exerciseId: newExerciseId, sets: 3, targetReps: 10, restSeconds: 90 };
      }),
    }));
  };

  const updateExercise = (idx: number, patch: Partial<RoutineExercise>) => 
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)) }));

  const removeExercise = (idx: number) => 
    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name.trim() || form.exercises.length === 0) return;
    const ts = now();
    if (editing) {
      const updated: Routine = { ...editing, name: form.name.trim(), description: form.description.trim() || undefined, exercises: form.exercises, updatedAt: ts };
      await db.routines.put(updated);
      await enqueue({ kind: 'upsert', table: 'routines', record: updated as unknown as Record<string, unknown> });
    } else {
      const r: Routine = { id: uuid(), name: form.name.trim(), description: form.description.trim() || undefined, exercises: form.exercises, createdAt: ts, updatedAt: ts };
      await db.routines.add(r);
      await enqueue({ kind: 'upsert', table: 'routines', record: r as unknown as Record<string, unknown> });
    }
    setModalOpen(false);
  };

  const remove = async (r: Routine) => {
    if (!confirm(`¿Eliminar la rutina "${r.name}"?`)) return;
    await db.routines.delete(r.id);
    await enqueue({ kind: 'delete', table: 'routines', id: r.id });
  };

  const startSession = async (r: Routine) => {
    const sessionExercises: SessionExercise[] = r.exercises.map((re) => {
      if (isCardio(re.exerciseId)) {
        return {
          exerciseId: re.exerciseId,
          cardioDetails: {
            cardioType: re.cardioType ?? 'Cinta',
            durationMinutes: re.durationMinutes ?? 30,
            completed: false,
          },
        };
      }
      return {
        exerciseId: re.exerciseId,
        sets: Array.from({ length: re.sets ?? 3 }, (_, i) => ({ setNumber: i + 1, reps: re.targetReps ?? 10, weight: 0, completed: false })),
      };
    });

    const ts = now();
    const session: TrainingSession = { id: uuid(), routineId: r.id, routineName: r.name, date: ts, exercises: sessionExercises, completed: false, createdAt: ts, updatedAt: ts };
    await db.sessions.add(session);
    await enqueue({ kind: 'upsert', table: 'sessions', record: session as unknown as Record<string, unknown> });
    onStartSession(session.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardList size={24} className="text-brand-500" />Rutinas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Plantillas reutilizables de entrenamiento.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0"><Plus size={18} />Nueva Rutina</Button>
      </div>

      {routines.length === 0 ? (
        <Card><EmptyState icon={<ClipboardList size={32} />} title="Sin rutinas" description="Crea tu primera plantilla de rutina agregando ejercicios y series." action={<Button onClick={openCreate}><Plus size={18} />Nueva Rutina</Button>} /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardBody className="space-y-3 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-condensed text-base sm:text-lg font-bold break-words leading-tight">{r.name}</h3>
                  {r.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words whitespace-normal">{r.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.exercises.map((re, i) => {
                      const cardio = isCardio(re.exerciseId);
                      return (
                        <Badge key={i} color={cardio ? 'blue' : 'gray'}>
                          {exName(re.exerciseId)} {cardio ? `· ${re.durationMinutes ?? 30} min` : `· ${re.sets}x${re.targetReps}`}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 mt-auto">
                  <Button size="sm" onClick={() => startSession(r)} className="flex-1"><Play size={14} />Iniciar</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil size={14} /></Button>
                  <Button size="sm" variant="danger" onClick={() => remove(r)}><Trash2 size={14} /></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Rutina' : 'Nueva Rutina'} size="lg"
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button></>}>
        <div className="space-y-4">
          <div><Label htmlFor="r-name">Nombre</Label><Input id="r-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Push/Pull/Legs A" /></div>
          <div><Label htmlFor="r-desc">Descripción (opcional)</Label><Textarea id="r-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Notas sobre la rutina..." rows={2} /></div>
          <div>
            <div className="flex items-center justify-between mb-2"><Label>Ejercicios</Label><Button size="sm" variant="outline" onClick={addExercise} disabled={exercises.length === 0}><Plus size={14} />Agregar</Button></div>
            {form.exercises.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl break-words">Agrega al menos un ejercicio</p>
            ) : (
              <div className="space-y-2">
                {form.exercises.map((re, idx) => {
                  const cardio = isCardio(re.exerciseId);
                  return (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1 min-w-[140px]">
                        <Label>Ejercicio</Label>
                        <Select value={re.exerciseId} onChange={(e) => handleExerciseChange(idx, e.target.value)}>
                          {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                        </Select>
                      </div>

                      {cardio ? (
                        <>
                          <div className="w-32">
                            <Label>Tipo Cardio</Label>
                            <Select value={re.cardioType ?? 'Cinta'} onChange={(e) => updateExercise(idx, { cardioType: e.target.value })}>
                              <option value="Cinta">Cinta / Trote</option>
                              <option value="Bicicleta">Bicicleta</option>
                              <option value="Elíptica">Elíptica</option>
                              <option value="Caminata">Caminata</option>
                              <option value="Remo">Remo</option>
                              <option value="Otro">Otro</option>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label>Tiempo (min)</Label>
                            <Input type="number" min={1} value={re.durationMinutes ?? 30} onChange={(e) => updateExercise(idx, { durationMinutes: Math.max(1, Number(e.target.value)) })} />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16"><Label>Series</Label><Input type="number" min={1} value={re.sets ?? 3} onChange={(e) => updateExercise(idx, { sets: Math.max(1, Number(e.target.value)) })} /></div>
                          <div className="w-16"><Label>Reps</Label><Input type="number" min={1} value={re.targetReps ?? 10} onChange={(e) => updateExercise(idx, { targetReps: Math.max(1, Number(e.target.value)) })} /></div>
                          <div className="w-20"><Label>Descanso(s)</Label><Input type="number" min={0} value={re.restSeconds ?? 90} onChange={(e) => updateExercise(idx, { restSeconds: Math.max(0, Number(e.target.value)) })} /></div>
                        </>
                      )}

                      <Button size="icon" variant="danger" onClick={() => removeExercise(idx)} className="h-10 w-10 shrink-0"><X size={16} /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
