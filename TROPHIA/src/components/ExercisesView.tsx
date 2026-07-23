import { useMemo, useState } from 'react';
import { TrendingUp, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { enqueue } from '@/lib/sync';
import { uuid, now } from '@/lib/uuid';
import type { Exercise, MuscleGroup } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

const MUSCLE_GROUPS: MuscleGroup[] = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core', 'Glúteos', 'Cardio'];
const GROUP_COLORS: Record<MuscleGroup, 'brand' | 'green' | 'blue' | 'amber' | 'red' | 'gray'> = {
  Pecho: 'brand', Espalda: 'blue', Piernas: 'green', Hombros: 'amber', Brazos: 'red', Core: 'gray', Glúteos: 'brand', Cardio: 'blue',
};

interface FormState { name: string; muscleGroup: MuscleGroup; notes: string; }

export function ExercisesView() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [], [] as Exercise[]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', muscleGroup: 'Pecho', notes: '' });

  const filtered = useMemo(() => exercises.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || e.muscleGroup === filter)), [exercises, search, filter]);
  const grouped = useMemo(() => {
    const map = new Map<MuscleGroup, Exercise[]>();
    filtered.forEach((e) => { const arr = map.get(e.muscleGroup) ?? []; arr.push(e); map.set(e.muscleGroup, arr); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const openCreate = () => { setEditing(null); setForm({ name: '', muscleGroup: 'Pecho', notes: '' }); setModalOpen(true); };
  const openEdit = (e: Exercise) => { setEditing(e); setForm({ name: e.name, muscleGroup: e.muscleGroup, notes: e.notes ?? '' }); setModalOpen(true); };

  const save = async () => {
    if (!form.name.trim()) return;
    const ts = now();
    if (editing) {
      const updated: Exercise = { ...editing, name: form.name.trim(), muscleGroup: form.muscleGroup, notes: form.notes.trim() || undefined, updatedAt: ts };
      await db.exercises.put(updated);
      await enqueue({ kind: 'upsert', table: 'exercises', record: updated as unknown as Record<string, unknown> });
    } else {
      const ex: Exercise = { id: uuid(), name: form.name.trim(), muscleGroup: form.muscleGroup, notes: form.notes.trim() || undefined, createdAt: ts, updatedAt: ts };
      await db.exercises.add(ex);
      await enqueue({ kind: 'upsert', table: 'exercises', record: ex as unknown as Record<string, unknown> });
    }
    setModalOpen(false);
  };

  const remove = async (e: Exercise) => {
    if (!confirm(`¿Eliminar el ejercicio "${e.name}"?`)) return;
    await db.exercises.delete(e.id);
    await enqueue({ kind: 'delete', table: 'exercises', id: e.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><TrendingUp size={24} className="text-brand-500" />Ejercicios</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Catálogo de ejercicios por grupo muscular.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0"><Plus size={18} />Nuevo Ejercicio</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Buscar ejercicio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as MuscleGroup | 'all')} className="sm:w-48">
          <option value="all">Todos los grupos</option>
          {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select>
      </div>
      {grouped.length === 0 ? (
        <Card><EmptyState icon={<TrendingUp size={32} />} title="Sin ejercicios" description="Crea un ejercicio personalizado o ajusta el filtro." action={<Button onClick={openCreate}><Plus size={18} />Nuevo Ejercicio</Button>} /></Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3"><Badge color={GROUP_COLORS[group]}>{group}</Badge><span className="text-xs text-gray-400">{items.length}</span></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((e) => (
                  <Card key={e.id} className="hover:shadow-md transition-shadow">
                    <CardBody className="space-y-3">
                      <h3 className="font-semibold break-words leading-tight">{e.name}</h3>
                      {e.notes && <p className="text-xs text-gray-500 dark:text-gray-400 break-words whitespace-normal">{e.notes}</p>}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(e)} className="flex-1"><Pencil size={14} />Editar</Button>
                        <Button size="sm" variant="danger" onClick={() => remove(e)}><Trash2 size={14} /></Button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? 'Guardar' : 'Crear'}</Button></>}>
        <div className="space-y-4">
          <div><Label htmlFor="ex-name">Nombre</Label><Input id="ex-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Press de Banca" /></div>
          <div><Label htmlFor="ex-group">Grupo Muscular</Label><Select id="ex-group" value={form.muscleGroup} onChange={(e) => setForm((f) => ({ ...f, muscleGroup: e.target.value as MuscleGroup }))}>{MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</Select></div>
          <div><Label htmlFor="ex-notes">Notas (opcional)</Label><Textarea id="ex-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Notas sobre técnica, equipo..." rows={3} /></div>
        </div>
      </Modal>
    </div>
  );
}
