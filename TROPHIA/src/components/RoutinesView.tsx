import { useState, useMemo } from 'react';
import { ClipboardList, Plus, Pencil, Trash2, X, HelpCircle, Sparkles, Lightbulb } from 'lucide-react';
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
  exercises: (RoutineExercise & { _tempId: string })[];
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  exercises: [],
};

export function RoutinesView() {
  const { user } = useAuth();

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

  // Filtro y deduplicación estricta para evitar ejercicios duplicados o "fantasma" en los desplegables
  const exercises = useMemo(() => {
    const userExercises = rawExercises.filter((e) => {
      const exUserId = e.userId || e.user_id;
      if (!exUserId) return true;
      return exUserId === user?.id;
    });

    const seenNames = new Set<string>();
    return userExercises.filter((e) => {
      const nameKey = e.name.trim().toLowerCase();
      if (seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
      return true;
    });
  }, [rawExercises, user?.id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [editing, setEditing] = useState<Routine | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const getExercise = (id: string) => exercises.find((e) => e.id === id);
  const isCardio = (id: string) => getExercise(id)?.muscleGroup?.toLowerCase() === 'cardio';

  // Insights / Diagnóstico para Rutinas
  const routineInsights = useMemo(() => {
    if (routines.length === 0) {
      return {
        tag: 'SIN RUTINAS',
        color: 'gray',
        message: 'Aún no has creado ninguna plantilla de rutina. Diseña tu primera rutina estructurada para optimizar tus entrenamientos.',
      };
    }

    let totalSeries = 0;
    const muscleMap: Record<string, number> = {};

    routines.forEach((r) => {
      r.exercises.forEach((re) => {
        const ex = getExercise(re.exerciseId);
        if (ex && ex.muscleGroup && ex.muscleGroup.toLowerCase() !== 'cardio') {
          const sets = re.sets || 3;
          totalSeries += sets;
          const group = ex.muscleGroup;
          muscleMap[group] = (muscleMap[group] || 0) + sets;
        }
      });
    });

    const topMuscle = Object.entries(muscleMap).sort((a, b) => b[1] - a[1])[0];

    return {
      tag: 'VOLUMEN ESTRUCTURADO',
      color: 'emerald',
      message: `Tienes ${routines.length} ${routines.length === 1 ? 'rutina configurada' : 'rutinas configuradas'} con un total de ${totalSeries} series efectivas programadas. ${
        topMuscle
          ? `El grupo muscular con mayor volumen planificado es ${topMuscle[0]} (${topMuscle[1]} series).`
          : ''
      }`,
    };
  }, [routines, exercises]);

  const openCreate = () => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setModalOpen(true);
  };

  const openEdit = (r: Routine) => {
    setEditing(r);
    const validExercises = r.exercises
      .filter((re) => !!getExercise(re.exerciseId))
      .map((re) => ({ ...re, _tempId: uuid() }));

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

    const newExercise = isFirstCardio
      ? { exerciseId: firstEx.id, cardioType: 'Cinta', durationMinutes: 30, _tempId: uuid() }
      : { exerciseId: firstEx.id, sets: 3, targetReps: 10, restSeconds: 90, _tempId: uuid() };

    setForm((f) => ({ ...f, exercises: [...f.exercises, newExercise] }));
  };

  const handleExerciseChange = (tempId: string, newExerciseId: string) => {
    const cardio = isCardio(newExerciseId);
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e) => {
        if (e._tempId !== tempId) return e;
        return cardio
          ? {
              ...e,
              exerciseId: newExerciseId,
              cardioType: 'Cinta',
              durationMinutes: 30,
              sets: undefined,
              targetReps: undefined,
              restSeconds: undefined,
            }
          : {
              ...e,
              exerciseId: newExerciseId,
              sets: 3,
              targetReps: 10,
              restSeconds: 90,
              cardioType: undefined,
              durationMinutes: undefined,
            };
      }),
    }));
  };

  const updateExercise = (tempId: string, patch: Partial<RoutineExercise>) =>
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((e) => (e._tempId === tempId ? { ...e, ...patch } : e)),
    }));

  const removeExercise = (tempId: string) =>
    setForm((f) => ({
      ...f,
      exercises: f.exercises.filter((e) => e._tempId !== tempId),
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
              const addedSets: SessionSet[] = Array.from({ length: targetSetCount - existingSets.length }).map(
                (_, i) => ({
                  setNumber: existingSets.length + i + 1,
                  reps: re.targetReps || 10,
                  weight: 0,
                  rir: 2,
                  completed: false,
                })
              );
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
        await enqueue({
          kind: 'upsert',
          table: 'sessions',
          record: updatedSession as unknown as Record<string, unknown>,
        });
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

    const cleanedExercises: RoutineExercise[] = form.exercises.map(
      ({ exerciseId, sets, targetReps, restSeconds, cardioType, durationMinutes }) => ({
        exerciseId,
        ...(sets !== undefined && sets !== null ? { sets: sets || 3 } : {}),
        ...(targetReps !== undefined && targetReps !== null ? { targetReps: targetReps || 10 } : {}),
        ...(restSeconds !== undefined && restSeconds !== null ? { restSeconds: restSeconds ?? 90 } : {}),
        ...(cardioType !== undefined ? { cardioType } : {}),
        ...(durationMinutes !== undefined && durationMinutes !== null ? { durationMinutes: durationMinutes || 30 } : {}),
      })
    );

    const ts = now();
    if (editing) {
      const updated: Routine = {
        ...editing,
        userId: user.id,
        name: cleanName,
        description: form.description.trim() || undefined,
        exercises: cleanedExercises,
        updatedAt: ts,
      };
      await db.routines.put(updated);
      await enqueue({
        kind: 'upsert',
        table: 'routines',
        record: updated as unknown as Record<string, unknown>,
      });

      await syncRoutineToSessions(updated);
    } else {
      const created: Routine = {
        id: uuid(),
        userId: user.id,
        name: cleanName,
        description: form.description.trim() || undefined,
        exercises: cleanedExercises,
        createdAt: ts,
        updatedAt: ts,
      };
      await db.routines.add(created);
      await enqueue({
        kind: 'upsert',
        table: 'routines',
        record: created as unknown as Record<string, unknown>,
      });
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
            Plantillas reutilizables para estructurar tus entrenamientos.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setGuideOpen(true)} className="gap-2">
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Guía de Rutinas</span>
          </Button>
          <Button onClick={openCreate} className="shrink-0">
            <Plus size={18} />
            Nueva Rutina
          </Button>
        </div>
      </header>

      {/* Tarjeta de Diagnóstico Inteligente */}
      <Card className="border border-brand-500/20 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent">
        <CardBody className="p-4 sm:p-5">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-500 shrink-0 mt-0.5">
              <Sparkles size={20} />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs tracking-wider uppercase text-brand-600 dark:text-brand-400">
                  Diagnóstico de Rutinas
                </span>
                <Badge color={routineInsights.color as any}>{routineInsights.tag}</Badge>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {routineInsights.message}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

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
                      .filter(({ ex }) => !!ex)
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

      {/* Modal Guía Explicativa */}
      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Guía de Rutinas TROPHIA" size="md">
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-start gap-3">
            <Lightbulb size={20} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Las rutinas son plantillas prediseñadas que facilitan el registro acelerado de tus entrenamientos diarios sin repetir la configuración cada vez.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                1. Selección y Orden de Ejercicios
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ubica al inicio de la rutina los ejercicios multiarticulares más demandantes (Sentadilla, Press Banco, Peso Muerto) cuando tus niveles de energía son máximos.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                2. Volumen Semanal Objetivo (10-20 series)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Asegúrate de que tus rutinas sumen entre 10 y 20 series efectivas por grupo muscular a la semana para maximizar la hipertrofia sin sobrepasar tu capacidad de recuperación.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-1">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                3. Tiempos de Descanso
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configura un temporizador adecuado (90 a 180 segundos en básicos y 60 a 90 segundos en aislados) para activar el cronómetro automático al completar cada serie.
              </p>
            </div>
          </div>

          <Button onClick={() => setGuideOpen(false)} className="w-full mt-2">
            Entendido
          </Button>
        </div>
      </Modal>

      {/* Modal Formulario Crear / Editar */}
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
            <Button type="submit" form="routine-form">
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
                {form.exercises.map((re) => {
                  const cardio = isCardio(re.exerciseId);
                  return (
                    <div key={re._tempId} className="flex flex-wrap items-end gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex-1 min-w-[140px]">
                        <Label>Ejercicio</Label>
                        <Select value={re.exerciseId} onChange={(e) => handleExerciseChange(re._tempId, e.target.value)}>
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
                              onChange={(e) => updateExercise(re._tempId, { cardioType: e.target.value })}
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
                              inputMode="numeric"
                              min={1}
                              placeholder="30"
                              value={re.durationMinutes ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === '' ? undefined : parseInt(val, 10);
                                updateExercise(re._tempId, { durationMinutes: isNaN(parsed as number) ? undefined : parsed });
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16">
                            <Label>Series</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              placeholder="3"
                              value={re.sets ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === '' ? undefined : parseInt(val, 10);
                                updateExercise(re._tempId, { sets: isNaN(parsed as number) ? undefined : parsed });
                              }}
                            />
                          </div>
                          <div className="w-16">
                            <Label>Reps</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              placeholder="10"
                              value={re.targetReps ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === '' ? undefined : parseInt(val, 10);
                                updateExercise(re._tempId, { targetReps: isNaN(parsed as number) ? undefined : parsed });
                              }}
                            />
                          </div>
                          <div className="w-20">
                            <Label>Descanso(s)</Label>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder="90"
                              value={re.restSeconds ?? ''}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = e.target.value;
                                const parsed = val === '' ? undefined : parseInt(val, 10);
                                updateExercise(re._tempId, { restSeconds: isNaN(parsed as number) ? undefined : parsed });
                              }}
                            />
                          </div>
                        </>
                      )}

                      <Button
                        type="button"
                        size="icon"
                        variant="danger"
                        onClick={() => removeExercise(re._tempId)}
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
