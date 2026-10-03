import { useState } from 'react';
import { Dumbbell, Plus, Trash2, Search, X, Filter, Pencil } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid } from '@/lib/uuid';
import type { Exercise } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Piernas',
  'Glúteos',
  'Hombros',
  'Brazos',
  'Abdominales',
  'Cardio',
  'Otro'
];

const getMuscleBadgeColor = (muscle: string): 'red' | 'blue' | 'green' | 'gray' | 'brand' | 'amber' => {
  switch (muscle) {
    case 'Pecho': return 'red';
    case 'Espalda': return 'blue';
    case 'Piernas': return 'green';
    case 'Glúteos': return 'green';
    case 'Hombros': return 'brand';
    case 'Brazos': return 'amber';
    case 'Abdominales': return 'red';
    case 'Cardio': return 'green';
    default: return 'gray';
  }
};

export function ExercisesView() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const exercises = useLiveQuery(
    async () => {
      if (!currentUserId) return [];
      const all = await db.exercises.toArray();
      return all
        .filter((e) => e.userId === currentUserId)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [currentUserId],
    [] as Exercise[]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Todos');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estados para el formulario y control de edición
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('Pecho');
  const [editingId, setEditingId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName('');
    setMuscleGroup('Pecho');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setName(ex.name);
    setMuscleGroup(ex.muscleGroup);
    setIsCreateOpen(true);
  };

  const handleSaveExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !name.trim()) return;

    if (editingId) {
      // Actualizar ejercicio existente
      const updatedExercise: Exercise = {
        id: editingId,
        userId: currentUserId,
        name: name.trim(),
        muscleGroup,
      };

      await db.exercises.put(updatedExercise);
      await enqueue({ kind: 'upsert', table: 'exercises', record: updatedExercise as unknown as Record<string, unknown> });
      showToast('Ejercicio actualizado exitosamente');
    } else {
      // Crear nuevo ejercicio
      const newExercise: Exercise = {
        id: uuid(),
        userId: currentUserId,
        name: name.trim(),
        muscleGroup,
      };

      await db.exercises.add(newExercise);
      await enqueue({ kind: 'upsert', table: 'exercises', record: newExercise as unknown as Record<string, unknown> });
      showToast('Ejercicio creado exitosamente');
    }

    setName('');
    setEditingId(null);
    setIsCreateOpen(false);
  };

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return;
    await db.exercises.delete(id);
    await enqueue({ kind: 'delete', table: 'exercises', id });
    showToast('Ejercicio eliminado');
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = selectedMuscle === 'Todos' || ex.muscleGroup === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="space-y-6 px-3 sm:px-0 pb-16">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Cabecera responsiva */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Dumbbell size={24} className="text-brand-500 shrink-0" />
            Biblioteca de Ejercicios
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Administra tus ejercicios personalizados para tus rutinas.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto justify-center">
          <Plus size={18} />
          Nuevo ejercicio
        </Button>
      </div>

      {/* Controles de Búsqueda y Filtro Desplegable */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar ejercicio..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1b] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="sm:w-64 relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Filter size={16} />
          </div>
          <Select
            value={selectedMuscle}
            onChange={(e) => setSelectedMuscle(e.target.value)}
            className="pl-9"
          >
            <option value="Todos">Todos los grupos ({exercises.length})</option>
            {MUSCLE_GROUPS.map((mg) => {
              const count = exercises.filter((e) => e.muscleGroup === mg).length;
              return (
                <option key={mg} value={mg}>
                  {mg} ({count})
                </option>
              );
            })}
          </Select>
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Dumbbell size={32} />}
            title="No se encontraron ejercicios"
            description={searchQuery || selectedMuscle !== 'Todos' ? 'Prueba cambiando los filtros de búsqueda.' : 'Agrega tu primer ejercicio personalizado.'}
            action={
              <Button onClick={handleOpenCreate}>
                <Plus size={18} />
                Nuevo ejercicio
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExercises.map((ex) => (
            <Card key={ex.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base truncate text-gray-900 dark:text-gray-100">{ex.name}</h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge color={getMuscleBadgeColor(ex.muscleGroup)}>
                        {ex.muscleGroup}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(ex)}
                      className="p-2 text-gray-400 hover:text-brand-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                      title="Editar ejercicio"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteExercise(ex.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Eliminar ejercicio"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear / Editar Ejercicio */}
      <Modal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={editingId ? 'Editar Ejercicio' : 'Crear Nuevo Ejercicio'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveExercise}>
              {editingId ? 'Guardar cambios' : 'Guardar ejercicio'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveExercise} className="space-y-4 max-h-[55vh] overflow-y-auto px-1">
          <div>
            <Label>Nombre del ejercicio</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Press de Banca Inclinado"
              required
              autoFocus
            />
          </div>

          <div>
            <Label>Grupo muscular (Zona objetivo)</Label>
            <Select
              value={muscleGroup}
              onChange={(e) => setMuscleGroup(e.target.value)}
            >
              {MUSCLE_GROUPS.map((mg) => (
                <option key={mg} value={mg}>{mg}</option>
              ))}
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ExercisesView;
