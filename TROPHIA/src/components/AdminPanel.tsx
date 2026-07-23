import { useState } from 'react';
import { Shield, Plus, Pencil, Trash2, UserPlus, UserCog } from 'lucide-react';
import { useAuth, type SupabaseUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';

interface FormState { name: string; username: string; password: string; role: 'admin' | 'user'; }
const empty: FormState = { name: '', username: '', password: '', role: 'user' };

export function AdminPanel() {
  const { user, createUser, updateUser, deleteUser } = useAuth();
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SupabaseUser | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState('');

  const refresh = async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
    if (!error && data) setUsers(data as SupabaseUser[]);
    setLoaded(true);
  };

  if (!loaded) refresh();

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setModalOpen(true); };
  const openEdit = (u: SupabaseUser) => { setEditing(u); setForm({ name: u.name, username: u.username, password: u.password, role: u.role as 'admin' | 'user' }); setError(''); setModalOpen(true); };

  const save = async () => {
    setError('');
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) { setError('Todos los campos son obligatorios.'); return; }
    try {
      if (editing) {
        await updateUser(editing.id, { name: form.name.trim(), username: form.username.trim(), password: form.password, role: form.role });
      } else {
        await createUser({ name: form.name.trim(), username: form.username.trim(), password: form.password, role: form.role });
      }
      await refresh();
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    }
  };

  const remove = async (u: SupabaseUser) => {
    if (u.id === user?.id) { setError('No puedes eliminar tu propia cuenta mientras la usas.'); return; }
    if (!confirm(`¿Eliminar a ${u.name}? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteUser(u.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><Shield size={24} className="text-brand-500" />Panel de Administración</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Gestiona los usuarios con acceso al sistema.</p>
        </div>
        <Button onClick={openCreate} className="shrink-0"><Plus size={18} />Nuevo Usuario</Button>
      </div>
      {error && <div className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 text-sm break-words">{error}</div>}
      {!loaded ? (
        <Card><CardBody className="text-center text-sm text-gray-400 py-8">Cargando usuarios...</CardBody></Card>
      ) : users.length === 0 ? (
        <Card><EmptyState icon={<UserPlus size={32} />} title="Sin usuarios" description="Crea el primer usuario con acceso al sistema." action={<Button onClick={openCreate}><Plus size={18} />Nuevo Usuario</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <Card key={u.id} className="hover:shadow-md transition-shadow">
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                    <div className="min-w-0"><p className="font-semibold break-words leading-tight">{u.name}</p><p className="text-xs text-gray-500 break-words">@{u.username}</p></div>
                  </div>
                  <Badge color={u.role === 'admin' ? 'brand' : 'gray'}>{u.role === 'admin' ? 'Admin' : 'Usuario'}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)} className="flex-1"><Pencil size={14} />Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(u)}><Trash2 size={14} /></Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={save}>{editing ? <><UserCog size={16} />Guardar</> : <><UserPlus size={16} />Crear</>}</Button></>}>
        <div className="space-y-4">
          <div><Label htmlFor="name">Nombre completo</Label><Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan Pérez" /></div>
          <div><Label htmlFor="username">Usuario</Label><Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="usuario" /></div>
          <div><Label htmlFor="password">Contraseña</Label><Input id="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>
          <div><Label htmlFor="role">Rol</Label><Select id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}><option value="user">Usuario</option><option value="admin">Administrador</option></Select></div>
          {error && <p className="text-sm text-red-500 break-words">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
