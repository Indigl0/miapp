import { useState } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid, now } from '@/lib/uuid';
import type { Routine, RoutineExercise, Exercise, TrainingSession, SessionExercise, SessionSet } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

interface FormState {
  name: string;
  description: string;
  exercises: RoutineExercise[];
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  exercises: [],
};

export function RoutinesView() {
  const { user } = useAuth();

  // Filtra las rutinas en IndexedDB según el user.id autenticado
  const routines = useLiveQuery(
    async () => {
      if (!user) return [];
      const allRoutines = await db.routines.orderBy('updatedAt').reverse().toArray();
      return allRoutines.filter((r) => r.userId === user.id);
    },
    [user?.id],
    [] as Routine[]
  );

  const rawExercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[]);

  // Filtrar ejercicios visibles (los del usuario actual + base/legacy)
  const exercises = rawExercises.filter((e: any) => {
    if (!e.userId && !e.user_id) return true;
    return e.userId === user?.id || e.user_id === user?.id;
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const getExercise = (id: string) => exercises.find((e) => e.id === id);
  const isCardio = (id: string) => getExercise(id)?.muscleGroup?.toLowerCase() === 'cardio';

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (r: Routine) => {
    setEditing(r);
    // Al editar, filtramos ejercicios de la rutina que ya no existan en la DB
    const validExercises = r.exercises.filter((re) => !!getExercise(re.exerciseId));
    setForm({
      name: r.name,
      description: r.description ?? '',
      exercises: validExercises,
    });
    setModalOpen(true);
  };

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
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e, i) => (i === idx ? { ...e, ...patch } : e)),
    }));

  const removeExercise = (idx: number) =>
    setForm((f) => ({
      ...f,
      exercises: f.exercises.filter((_, i) => i !== idx),
    }));

  const syncRoutineToSessions = async (routine: Routine) => {
    try {
      if (!user) return;
      const sessions = await db.sessions.toArray();
      const matchingSessions = sessions.filter(
        (s) => s.userId === user.id && !s.completed && (s.routineId === routine.id || s.routineName === routine.name)
      );

      for (const session of matchingSessions) {
        const existingEntries = session.exercises || [];

        const updatedExercises: SessionExercise[] = routine.exercises.map((re) => {
          const match = existingEntries.find((e) => e.exerciseId === re.exerciseId);
          const cardio = isCardio(re.exerciseId);

          if (match) {
            if (cardio || match.cardioDetails) {
              return {
                ...match,
                cardioDetails: {
                  ...match.cardioDetails,
                  cardioType: re.cardioType || match.cardioDetails?.cardioType || 'Cinta',
                  durationMinutes: re.durationMinutes || match.cardioDetails?.durationMinutes || 30,
                  completed: match.cardioDetails?.completed ?? false,
                },
              };
            }

            const existingSets = match.sets || [];
            const targetSetCount = re.sets || 3;
            let updatedSets: SessionSet[] = [];

            if (existingSets.length < targetSetCount) {
              const addedSets: SessionSet[] = Array.from({ length: targetSetCount - existingSets.length }).map((_, i) => ({
                setNumber: existingSets.length + i + 1,
                reps: re.targetReps || 10,
                weight: 0,
                rir: 2,
                completed: false,
              }));
              updatedSets = [...existingSets, ...addedSets];
            } else if (existingSets.length > targetSetCount) {
              updatedSets = existingSets.slice(0, targetSetCount);
            } else {
              updatedSets = existingSets;
            }

            return {
              ...match,
              sets: updatedSets,
            };
          }

          if (cardio) {
            return {
              exerciseId: re.exerciseId,
              cardioDetails: {
                cardioType: re.cardioType || 'Cinta',
                durationMinutes: re.durationMinutes || 30,
                completed: false,
              },
            };
          }

          const defaultSets: SessionSet[] = Array.from({ length: re.sets || 3 }).map((_, i) => ({
            setNumber: i + 1,
            reps: re.targetReps || 10,
            weight: 0,
            rir: 2,
            completed: false,
          }));

          return {
            exerciseId: re.exerciseId,
            sets: defaultSets,
          };
        });

        const updatedSession: TrainingSession = {
          ...session,
          userId: user.id,
          routineName: routine.name,
          exercises: updatedExercises,
          updatedAt: now(),
        };

        await db.sessions.put(updatedSession);
        await enqueue({ kind: 'upsert', table: 'sessions', record: updatedSession as unknown as Record<string, unknown> });
      }
    } catch (err) {
      console.error('Error sincronizando rutina con sesiones:', err);
    }
  };

  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    const cleanName = form.name.trim();
    if (!cleanName || form.exercises.length === 0) return;

    const ts = now();
    if (editing) {
      const updated: Routine = {
        ...editing,
        userId: user.id,
        name: cleanName,
        description: form.description.trim() || undefined,
        exercises: form.exercises,
        updatedAt: ts,
      };
      await db.routines.put(updated);
      await enqueue({ kind: 'upsert', table: 'routines', record: updated as unknown as Record<string, unknown> });

      await syncRoutineToSessions(updated);
    } else {
      const created: Routine = {
        id: uuid(),
        userId: user.id,
        name: cleanName,
        description: form.description.trim() || undefined,
        exercises: form.exercises,
        createdAt: ts,
        updatedAt: ts,
      };
      await db.routines.add(created);
      await enqueue({ kind: 'upsert', table: 'routines', record: created as unknown as Record<string, unknown> });
    }
    setModalOpen(false);
  };

  const remove = async (r: Routine) => {
    if (!confirm(`¿Eliminar la rutina "${r.name}"?`)) return;
    await db.routines.delete(r.id);
    await enqueue({ kind: 'delete', table: 'routines', id: r.id });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList size={24} className="text-brand-500" />
            Rutinas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
            Plantillas reutilizables de entrenamiento.
          </p>
        </div>
        <Button onClick={openCreate} className="shrink-0">
          <Plus size={18} />
          Nueva Rutina
        </Button>
      </header>

      {routines.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={32} />}
            title="Sin rutinas"
            description="Crea tu primera plantilla de rutina agregando ejercicios y series."
            action={
              <Button onClick={openCreate}>
                <Plus size={18} />
                Nueva Rutina
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routines.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardBody className="space-y-3 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-condensed text-base sm:text-lg font-bold break-words leading-tight">
                    {r.name}
                  </h3>
                  {r.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words whitespace-normal">
                      {r.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.exercises
                      .map((re) => ({ re, ex: getExercise(re.exerciseId) }))
                      .filter(({ ex }) => !!ex) // Filtra ejercicios eliminados
                      .map(({ re, ex }, i) => {
                        const cardio = ex?.muscleGroup?.toLowerCase() === 'cardio';
                        return (
                          <Badge key={i} color={cardio ? 'blue' : 'gray'}>
                            {ex?.name} {cardio ? `· ${re.durationMinutes ?? 30} min` : `· ${re.sets}x${re.targetReps}`}
                          </Badge>
                        );
                      })}
                  </div>
                </div>
                <div className="flex gap-2 pt-2 mt-auto">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)} className="flex-1">
                    <Pencil size={14} className="mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(r)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Rutina' : 'Nueva Rutina'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} type="submit" form="routine-form">
              {editing ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="routine-form" onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="r-name">Nombre</Label>
            <Input
              id="r-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Push/Pull/Legs A"
            />
          </div>
          <div>
            <Label htmlFor="r-desc">Descripción (opcional)</Label>
            <Textarea
              id="r-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Notas sobre la rutina..."
              rows={2}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Ejercicios</Label>
              <Button size="sm" variant="outline" type="button" onClick={addExercise} disabled={exercises.length === 0}>
                <Plus size={14} /> Agregar
              </Button>
            </div>
            {form.exercises.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl break-words">
                Agrega al menos un ejercicio
              </p>
            ) : (
              <div className="space-y-2">
                {form.exercises.map((re, idx) => {
                  const cardio = isCardio(re.exerciseId);
                  return (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1 min-w-[140px]">
                        <Label>Ejercicio</Label>
                        <Select value={re.exerciseId} onChange={(e) => handleExerciseChange(idx, e.target.value)}>
                          {exercises.map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </Select>
                      </div>

                      {cardio ? (
                        <>
                          <div className="w-32">
                            <Label>Tipo Cardio</Label>
                            <Select
                              value={re.cardioType ?? 'Cinta'}
                              onChange={(e) => updateExercise(idx, { cardioType: e.target.value })}
                            >
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
                            <Input
                              type="number"
                              min={1}
                              value={re.durationMinutes ?? 30}
                              onChange={(e) => updateExercise(idx, { durationMinutes: Math.max(1, Number(e.target.value)) })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16">
                            <Label>Series</Label>
                            <Input
                              type="number"
                              min={1}
                              value={re.sets ?? 3}
                              onChange={(e) => updateExercise(idx, { sets: Math.max(1, Number(e.target.value)) })}
                            />
                          </div>
                          <div className="w-16">
                            <Label>Reps</Label>
                            <Input
                              type="number"
                              min={1}
                              value={re.targetReps ?? 10}
                              onChange={(e) => updateExercise(idx, { targetReps: Math.max(1, Number(e.target.value)) })}
                            />
                          </div>
                          <div className="w-20">
                            <Label>Descanso(s)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={re.restSeconds ?? 90}
                              onChange={(e) => updateExercise(idx, { restSeconds: Math.max(0, Number(e.target.value)) })}
                            />
                          </div>
                        </>
                      )}

                      <Button
                        type="button"
                        size="icon"
                        variant="danger"
                        onClick={() => removeExercise(idx)}
                        className="h-10 w-10 shrink-0"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
