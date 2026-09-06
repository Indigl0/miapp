import { useState, useEffect } from 'react';
// @ts-ignore
import { supabase } from '../supabase';
import { useAuth } from '@/lib/auth';
import { Scale, Calendar, Plus, Edit2, Check, ArrowUpRight, ArrowDownRight, Minus, Trash2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

interface UserProfile {
  age: number | '';
  height: number | '';
  initial_weight: number | '';
  goal: string;
}

interface WeightLog {
  id: string;
  weight: number;
  date: string;
  notes?: string;
}

export function MetricsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Perfil del usuario
  const [profile, setProfile] = useState<UserProfile>({
    age: '',
    height: '',
    initial_weight: '',
    goal: 'Ganar Masa Muscular',
  });

  // Historial de pesos
  const [logs, setLogs] = useState<WeightLog[]>([]);
  
  // Nuevo registro de peso
  const [newWeight, setNewWeight] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar Perfil
      const { data: profData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profData) {
        setProfile({
          age: profData.age || '',
          height: profData.height || '',
          initial_weight: profData.initial_weight || '',
          goal: profData.goal || 'Ganar Masa Muscular',
        });
      }

      // Cargar Registros de Peso
      const { data: weightData } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: true });

      if (weightData) {
        setLogs(weightData);
      }
    } catch (err) {
      console.error('Error cargando métricas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      const payload = {
        user_id: user.id,
        name: user.name,
        age: profile.age === '' ? null : Number(profile.age),
        height: profile.height === '' ? null : Number(profile.height),
        initial_weight: profile.initial_weight === '' ? null : Number(profile.initial_weight),
        goal: profile.goal,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      setEditingProfile(false);
    } catch (err) {
      console.error('Error guardando perfil:', err);
    }
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWeight || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .insert([
          {
            user_id: user.id,
            weight: Number(newWeight),
            date: newDate,
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        setLogs((prev) => [...prev, ...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        setNewWeight('');
      }
    } catch (err) {
      console.error('Error guardando peso:', err);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const { error } = await supabase.from('weight_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error eliminando registro:', err);
    }
  };

  // Cálculos rápidos
  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : Number(profile.initial_weight) || 0;
  const initialWeight = Number(profile.initial_weight) || 0;
  const weightDiff = initialWeight > 0 && latestWeight > 0 ? (latestWeight - initialWeight).toFixed(1) : '0';

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER TÍTULO Y PERFIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Métricas del Usuario</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control de composición corporal y avance de peso en el tiempo.
          </p>
        </div>
        <button
          onClick={() => (editingProfile ? handleSaveProfile() : setEditingProfile(true))}
          className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-fit"
        >
          {editingProfile ? <Check size={16} className="text-emerald-500" /> : <Edit2 size={16} />}
          <span>{editingProfile ? 'Guardar Perfil' : 'Editar Datos Base'}</span>
        </button>
      </div>

      {/* TARJETA DE DATOS DEL PERFIL */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estatura</label>
            {editingProfile ? (
              <input
                type="number"
                value={profile.height}
                onChange={(e) => setProfile({ ...profile, height: e.target.value ? Number(e.target.value) : '' })}
                placeholder="cm (ej: 175)"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="mt-1 text-xl font-bold">{profile.height ? `${profile.height} cm` : '--'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Edad</label>
            {editingProfile ? (
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : '' })}
                placeholder="Años"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="mt-1 text-xl font-bold">{profile.age ? `${profile.age} años` : '--'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Peso Inicial</label>
            {editingProfile ? (
              <input
                type="number"
                step="0.1"
                value={profile.initial_weight}
                onChange={(e) => setProfile({ ...profile, initial_weight: e.target.value ? Number(e.target.value) : '' })}
                placeholder="kg (ej: 70.5)"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <p className="mt-1 text-xl font-bold">{profile.initial_weight ? `${profile.initial_weight} kg` : '--'}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Objetivo</label>
            {editingProfile ? (
              <select
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#161618] px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Perder Peso">Perder Peso / Definición</option>
                <option value="Ganar Masa Muscular">Ganar Masa Muscular</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Recomposición Corporal">Recomposición Corporal</option>
              </select>
            ) : (
              <p className="mt-1 text-base font-bold text-brand-500">{profile.goal}</p>
            )}
          </div>
        </div>
      </div>

      {/* KPIS DE PROGRESO DE PESO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase">Peso Inicial</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold">{initialWeight || '--'}</span>
            <span className="text-sm font-medium text-gray-500">kg</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase">Peso Actual</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-brand-500">{latestWeight || '--'}</span>
            <span className="text-sm font-medium text-gray-500">kg</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase">Variación Total</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-3xl font-extrabold">
              {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff}
            </span>
            <span className="text-sm font-medium text-gray-500">kg</span>
            {Number(weightDiff) > 0 && <ArrowUpRight className="text-amber-500" size={24} />}
            {Number(weightDiff) < 0 && <ArrowDownRight className="text-emerald-500" size={24} />}
            {Number(weightDiff) === 0 && <Minus className="text-gray-400" size={20} />}
          </div>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO RÁPIDO */}
      <form onSubmit={handleAddWeight} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-5 shadow-sm">
        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
          <Scale size={18} className="text-brand-500" />
          <span>Registrar Nuevo Peso</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="w-full sm:w-1/2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Peso (kg)</label>
            <input
              type="number"
              step="0.1"
              required
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Ej: 74.5"
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="w-full sm:w-1/2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white px-6 py-2.5 text-sm font-semibold hover:bg-brand-600 shadow-sm shadow-brand-500/30 transition-all"
          >
            <Plus size={18} />
            <span>Guardar Peso</span>
          </button>
        </div>
      </form>

      {/* GRÁFICO DE EVOLUCIÓN Y TABLA DE REGISTROS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-6 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold">Evolución en el Tiempo</h3>
            <p className="text-xs text-gray-500">Línea punteada muestra tu Peso Inicial de referencia.</p>
          </div>
          {logs.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161618', borderColor: '#333', borderRadius: '12px', color: '#fff' }}
                    formatter={(val: any) => [`${val} kg`, 'Peso']}
                  />
                  {initialWeight > 0 && (
                    <ReferenceLine y={initialWeight} stroke="#888" strokeDasharray="3 3" label={{ value: 'Inicial', fill: '#888', fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="weight" stroke="#FF6B00" strokeWidth={3} fillOpacity={1} fill="url(#weightGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400">
              Ingresa al menos un registro de peso para generar el gráfico.
            </div>
          )}
        </div>

        {/* Lista/Historial */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161618] p-6 shadow-sm">
          <h3 className="text-base font-bold mb-4">Historial de Pesajes</h3>
          {logs.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
              {logs.slice().reverse().map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800/60">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-bold">{item.weight} kg</p>
                      <p className="text-xs text-gray-400">{item.date}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteLog(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No hay registros aún.</p>
          )}
        </div>
      </div>
    </div>
  );
}
