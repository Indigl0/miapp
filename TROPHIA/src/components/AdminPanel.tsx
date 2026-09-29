import { useState, useRef } from 'react';
import { 
  Shield, 
  Plus, 
  Pencil, 
  Trash2, 
  UserPlus, 
  UserCog, 
  Download, 
  Upload, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
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
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estados para exportar/importar y plantillas
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingTemplates, setIsCreatingTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // ==========================================
  // SPRINT 3: RESPALDOS EN JSON (EXPORT/IMPORT)
  // ==========================================

  const handleExportJSON = async () => {
    if (!user?.id) return;
    setIsExporting(true);
    setStatusMessage(null);

    try {
      // 1. Obtener datos de todas las tablas asociadas al usuario
      const [
        { data: userProfiles },
        { data: exercises },
        { data: routines },
        { data: routineExercises },
        { data: workoutSessions },
        { data: exerciseLogs },
        { data: weightLogs },
        { data: bodyMetricsLogs },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id),
        supabase.from('exercises').select('*').eq('user_id', user.id),
        supabase.from('routines').select('*').eq('user_id', user.id),
        supabase.from('routine_exercises').select('*'),
        supabase.from('workout_sessions').select('*').eq('user_id', user.id),
        supabase.from('exercise_logs').select('*'),
        supabase.from('weight_logs').select('*').eq('user_id', user.id),
        supabase.from('body_metrics_logs').select('*').eq('user_id', user.id),
      ]);

      const backupData = {
        app: 'Trophia',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId: user.id,
        data: {
          userProfiles: userProfiles || [],
          exercises: exercises || [],
          routines: routines || [],
          routineExercises: routineExercises || [],
          workoutSessions: workoutSessions || [],
          exerciseLogs: exerciseLogs || [],
          weightLogs: weightLogs || [],
          bodyMetricsLogs: bodyMetricsLogs || [],
        },
      };

      // 2. Descargar archivo JSON
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `trophia_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setStatusMessage({ type: 'success', text: 'Copia de seguridad descargada exitosamente.' });
    } catch (err: any) {
      console.error('Error al exportar datos:', err);
      setStatusMessage({ type: 'error', text: `Error al exportar copia de seguridad: ${err.message || err}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!confirm('¿Deseas restaurar la copia de seguridad? Esto agregará los registros del archivo a tu cuenta actual.')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsImporting(true);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (!parsed.data) {
          throw new Error('El archivo JSON no tiene un formato válido de Trophia.');
        }

        const { data } = parsed;

        // Reemplazar user_id para asignar la información al usuario actual
        const mapUserId = (items: any[]) =>
          (items || []).map((item) => {
            const { id, ...rest } = item; // Omitimos ID primario si se auto-genera o para evitar colisiones
            return { ...rest, user_id: user.id };
          });

        if (data.exercises?.length) {
          await supabase.from('exercises').insert(mapUserId(data.exercises));
        }
        if (data.routines?.length) {
          await supabase.from('routines').insert(mapUserId(data.routines));
        }
        if (data.weightLogs?.length) {
          await supabase.from('weight_logs').insert(mapUserId(data.weightLogs));
        }
        if (data.bodyMetricsLogs?.length) {
          await supabase.from('body_metrics_logs').insert(mapUserId(data.bodyMetricsLogs));
        }

        setStatusMessage({ type: 'success', text: 'Datos e historial restaurados con éxito.' });
      } catch (err: any) {
        console.error('Error al importar datos:', err);
        setStatusMessage({ type: 'error', text: `Error al importar: ${err.message || err}` });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // ==========================================
  // SPRINT 3: PLANTILLAS PREDEFINIDAS BASE
  // ==========================================

  const handleCreateTemplates = async () => {
    if (!user?.id) return;
    setIsCreatingTemplates(true);
    setStatusMessage(null);

    try {
      // 1. Ejercicios base
      const defaultExercises = [
        { name: 'Press de Banca Plano', category: 'Pecho', target_muscle: 'Pectoral Mayor', notes: 'Ejercicio básico multiarticular' },
        { name: 'Press Militar con Barra', category: 'Hombros', target_muscle: 'Deltoides Anterior', notes: 'Enfocarse en estabilidad del core' },
        { name: 'Fondos en Paralelas', category: 'Pecho', target_muscle: 'Pectoral / Tríceps', notes: 'Inclinación ligera para más pecho' },
        { name: 'Remo con Barra', category: 'Espalda', target_muscle: 'Dorsal / Trapecio', notes: 'Mantener espalda neutra' },
        { name: 'Jalón al Pecho', category: 'Espalda', target_muscle: 'Dorsal Ancho', notes: 'Tracción controlada' },
        { name: 'Curl de Bíceps con Barra', category: 'Brazos', target_muscle: 'Bíceps Braquial', notes: 'Evitar balanceos' },
        { name: 'Sentadilla Trasera', category: 'Piernas', target_muscle: 'Cuádriceps / Glúteos', notes: 'Profundidad adecuada' },
        { name: 'Peso Muerto Rumano', category: 'Piernas', target_muscle: 'Isquiotibiales', notes: 'Enfoque en bisagra de cadera' },
        { name: 'Prensa de Piernas', category: 'Piernas', target_muscle: 'Cuádriceps', notes: 'Rango de movimiento completo' },
      ];

      // Insertar ejercicios para el usuario
      const exercisesWithUser = defaultExercises.map((ex) => ({ ...ex, user_id: user.id }));
      const { data: createdExercises, error: exError } = await supabase
        .from('exercises')
        .insert(exercisesWithUser)
        .select();

      if (exError) throw exError;

      // Mapear IDs de ejercicios
      const getExId = (name: string) => createdExercises?.find((e) => e.name === name)?.id;

      // 2. Rutinas base
      const defaultRoutines = [
        { name: 'Push (Empuje)', description: 'Pectoral, Hombros y Tríceps', user_id: user.id },
        { name: 'Pull (Tracción)', description: 'Espalda, Deltoides Posterior y Bíceps', user_id: user.id },
        { name: 'Legs (Pierna)', description: 'Cuádriceps, Isquiotibiales y Gemelos', user_id: user.id },
      ];

      const { data: createdRoutines, error: rutError } = await supabase
        .from('routines')
        .insert(defaultRoutines)
        .select();

      if (rutError) throw rutError;

      const pushRoutine = createdRoutines?.find((r) => r.name.includes('Push'));
      const pullRoutine = createdRoutines?.find((r) => r.name.includes('Pull'));
      const legsRoutine = createdRoutines?.find((r) => r.name.includes('Legs'));

      // 3. Vincular ejercicios a las rutinas
      const routineExercisesToInsert = [];

      if (pushRoutine) {
        if (getExId('Press de Banca Plano')) routineExercisesToInsert.push({ routine_id: pushRoutine.id, exercise_id: getExId('Press de Banca Plano'), target_sets: 4, target_reps: '8-10', order_index: 1 });
        if (getExId('Press Militar con Barra')) routineExercisesToInsert.push({ routine_id: pushRoutine.id, exercise_id: getExId('Press Militar con Barra'), target_sets: 3, target_reps: '10-12', order_index: 2 });
        if (getExId('Fondos en Paralelas')) routineExercisesToInsert.push({ routine_id: pushRoutine.id, exercise_id: getExId('Fondos en Paralelas'), target_sets: 3, target_reps: '10-12', order_index: 3 });
      }

      if (pullRoutine) {
        if (getExId('Remo con Barra')) routineExercisesToInsert.push({ routine_id: pullRoutine.id, exercise_id: getExId('Remo con Barra'), target_sets: 4, target_reps: '8-10', order_index: 1 });
        if (getExId('Jalón al Pecho')) routineExercisesToInsert.push({ routine_id: pullRoutine.id, exercise_id: getExId('Jalón al Pecho'), target_sets: 3, target_reps: '10-12', order_index: 2 });
        if (getExId('Curl de Bíceps con Barra')) routineExercisesToInsert.push({ routine_id: pullRoutine.id, exercise_id: getExId('Curl de Bíceps con Barra'), target_sets: 3, target_reps: '12-15', order_index: 3 });
      }

      if (legsRoutine) {
        if (getExId('Sentadilla Trasera')) routineExercisesToInsert.push({ routine_id: legsRoutine.id, exercise_id: getExId('Sentadilla Trasera'), target_sets: 4, target_reps: '6-8', order_index: 1 });
        if (getExId('Peso Muerto Rumano')) routineExercisesToInsert.push({ routine_id: legsRoutine.id, exercise_id: getExId('Peso Muerto Rumano'), target_sets: 3, target_reps: '8-10', order_index: 2 });
        if (getExId('Prensa de Piernas')) routineExercisesToInsert.push({ routine_id: legsRoutine.id, exercise_id: getExId('Prensa de Piernas'), target_sets: 3, target_reps: '10-12', order_index: 3 });
      }

      if (routineExercisesToInsert.length > 0) {
        await supabase.from('routine_exercises').insert(routineExercisesToInsert);
      }

      setStatusMessage({ type: 'success', text: 'Plantillas de rutina (Push / Pull / Legs) creadas correctamente.' });
    } catch (err: any) {
      console.error('Error creando plantillas:', err);
      setStatusMessage({ type: 'error', text: `Error al generar plantillas: ${err.message || err}` });
    } finally {
      setIsCreatingTemplates(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* MENSAJE GLOBAL DE ESTADO */}
      {statusMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* SECCIÓN 1: PLANTILLAS Y DATOS */}
      <div className="space-y-4">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database size={24} className="text-brand-500" />
            Configuración & Respaldos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
            Exporta tus datos en JSON, restaura copias de seguridad o carga plantillas de entrenamiento iniciales.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Cargar Plantillas Base */}
          <Card className="hover:border-brand-500/50 transition-colors">
            <CardBody className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 bg-brand-500/10 text-brand-500 w-fit rounded-xl mb-2">
                  <Sparkles size={20} />
                </div>
                <h3 className="font-bold text-base">Plantillas Iniciales</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Genera automáticamente un paquete base de rutinas y ejercicios (Push / Pull / Legs).
                </p>
              </div>
              <Button onClick={handleCreateTemplates} disabled={isCreatingTemplates} className="w-full">
                {isCreatingTemplates ? 'Generando...' : 'Cargar Rutinas Base'}
              </Button>
            </CardBody>
          </Card>

          {/* Exportar JSON */}
          <Card className="hover:border-brand-500/50 transition-colors">
            <CardBody className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 bg-brand-500/10 text-brand-500 w-fit rounded-xl mb-2">
                  <Download size={20} />
                </div>
                <h3 className="font-bold text-base">Exportar JSON</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Descarga una copia completa de tus ejercicios, rutinas e historial de pesaje.
                </p>
              </div>
              <Button onClick={handleExportJSON} disabled={isExporting} variant="outline" className="w-full">
                {isExporting ? 'Exportando...' : 'Descargar Copia JSON'}
              </Button>
            </CardBody>
          </Card>

          {/* Importar JSON */}
          <Card className="hover:border-brand-500/50 transition-colors">
            <CardBody className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="p-2.5 bg-brand-500/10 text-brand-500 w-fit rounded-xl mb-2">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-base">Importar & Restaurar</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Restaura registros desde un archivo JSON exportado previamente.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportJSON}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  variant="outline"
                  className="w-full"
                >
                  {isImporting ? 'Restaurando...' : 'Subir Archivo JSON'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <hr className="border-gray-200 dark:border-gray-800" />

      {/* SECCIÓN 2: GESTIÓN DE USUARIOS (SÓLO ADMINS) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Shield size={24} className="text-brand-500" />
              Panel de Administración
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">
              Gestiona los usuarios con acceso al sistema.
            </p>
          </div>
          <Button onClick={openCreate} className="shrink-0">
            <Plus size={18} />
            Nuevo Usuario
          </Button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-3 text-sm break-words">
            {error}
          </div>
        )}

        {!loaded ? (
          <Card>
            <CardBody className="text-center text-sm text-gray-400 py-8">Cargando usuarios...</CardBody>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <EmptyState
              icon={<UserPlus size={32} />}
              title="Sin usuarios"
              description="Crea el primer usuario con acceso al sistema."
              action={<Button onClick={openCreate}><Plus size={18} />Nuevo Usuario</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {users.map((u) => (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold break-words leading-tight">{u.name}</p>
                        <p className="text-xs text-gray-500 break-words">@{u.username}</p>
                      </div>
                    </div>
                    <Badge color={u.role === 'admin' ? 'brand' : 'gray'}>
                      {u.role === 'admin' ? 'Admin' : 'Usuario'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)} className="flex-1">
                      <Pencil size={14} />
                      Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => remove(u)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN / CREACIÓN DE USUARIO */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={save}>
              {editing ? <><UserCog size={16} />Guardar</> : <><UserPlus size={16} />Crear</>}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Juan Pérez" />
          </div>
          <div>
            <Label htmlFor="username">Usuario</Label>
            <Input id="username" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="usuario" />
          </div>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
          </div>
          <div>
            <Label htmlFor="role">Rol</Label>
            <Select id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          {error && <p className="text-sm text-red-500 break-words">{error}</p>}
        </div>
      </Modal>
    </div>
  );
}
