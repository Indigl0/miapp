import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { 
  Scale, 
  Calendar, 
  Plus, 
  Edit2, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  Trash2, 
  Info, 
  Target, 
  Ruler, 
  Activity 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

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

interface BodyMetricsLog {
  id: string;
  date: string;
  fat_percentage?: number | null;
  body_fat?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  hip?: number | null;
  biceps?: number | null;
  thighs?: number | null;
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const formatChartDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('T')[0].split('-');
  if (!year || !month || !day) return dateStr;
  
  const monthIdx = parseInt(month, 10) - 1;
  return `${day} ${MONTHS_ES[monthIdx] || month} ${year}`;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl px-3.5 py-2.5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 break-words">
        {label ? formatChartDate(label) : ''}
      </p>
      {payload.map((p, i) => {
        if (!p || p.value === undefined) return null;
        const name = p.name || '';
        return (
          <p key={i} className="text-sm font-bold break-words" style={{ color: p.color || '#f97316' }}>
            {name}: {p.value.toLocaleString('es-ES')} {name.includes('Grasa') ? '%' : 'kg'}
          </p>
        );
      })}
    </div>
  );
}

export function MetricsView() {
  const { user } = useAuth();
  const [theme] = useTheme();
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'weight' | 'measurements'>('weight');
  
  const isDark = theme === 'dark';
  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';

  const [profile, setProfile] = useState<UserProfile>({
    age: '',
    height: '',
    initial_weight: '',
    goal: 'Ganar Masa Muscular',
  });

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [bodyLogs, setBodyLogs] = useState<BodyMetricsLog[]>([]);

  const [newWeight, setNewWeight] = useState<string>('');
  const [newWeightDate, setNewWeightDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [newBodyLog, setNewBodyLog] = useState({
    date: new Date().toISOString().split('T')[0],
    fat_percentage: '',
    chest: '',
    waist: '',
    hips: '',
    biceps: '',
    thighs: '',
  });

  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profRes, weightRes, bodyRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('weight_logs').select('*').eq('user_id', user.id).order('date', { ascending: true }),
        supabase.from('body_metrics_logs').select('*').eq('user_id', user.id).order('date', { ascending: true })
      ]);

      if (profRes.data) {
        setProfile({
          age: profRes.data.age ?? '',
          height: profRes.data.height ?? '',
          initial_weight: profRes.data.initial_weight ?? '',
          goal: profRes.data.goal || 'Ganar Masa Muscular',
        });
      }

      if (weightRes.data) setLogs(weightRes.data);
      if (bodyRes.data) {
        const normalizedData = bodyRes.data.map((item: any) => ({
          ...item,
          fat_percentage: item.fat_percentage ?? item.body_fat ?? null,
          hips: item.hips ?? item.hip ?? null
        }));
        setBodyLogs(normalizedData);
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
        age: profile.age === '' ? null : Number(profile.age),
        height: profile.height === '' ? null : Number(profile.height),
        initial_weight: profile.initial_weight === '' ? null : Number(profile.initial_weight),
        goal: profile.goal,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(payload, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          age: data.age ?? '',
          height: data.height ?? '',
          initial_weight: data.initial_weight ?? '',
          goal: data.goal ?? 'Ganar Masa Muscular',
        });
      }

      setEditingProfile(false);
    } catch (err: any) {
      console.error('Error al guardar perfil:', err);
      alert(`Error al guardar perfil: ${err.message || err}`);
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
            date: newWeightDate,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setLogs((prev) => [...prev, ...data].sort((a, b) => a.date.localeCompare(b.date)));
        setNewWeight('');
      }
    } catch (err: any) {
      console.error('Error guardando peso:', err);
      alert(`Error al guardar peso: ${err.message || err}`);
    }
  };

  const handleDeleteWeightLog = async (id: string) => {
    try {
      const { error } = await supabase.from('weight_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error eliminando registro de peso:', err);
    }
  };

  const handleAddBodyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const payload = {
        user_id: user.id,
        date: newBodyLog.date,
        body_fat: newBodyLog.fat_percentage ? Number(newBodyLog.fat_percentage) : null,
        chest: newBodyLog.chest ? Number(newBodyLog.chest) : null,
        waist: newBodyLog.waist ? Number(newBodyLog.waist) : null,
        hip: newBodyLog.hips ? Number(newBodyLog.hips) : null,
        biceps: newBodyLog.biceps ? Number(newBodyLog.biceps) : null,
        thighs: newBodyLog.thighs ? Number(newBodyLog.thighs) : null,
      };

      const { data, error } = await supabase
        .from('body_metrics_logs')
        .insert([payload])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const addedItem = {
          ...data[0],
          fat_percentage: data[0].body_fat ?? data[0].fat_percentage ?? null,
          hips: data[0].hip ?? data[0].hips ?? null
        };

        setBodyLogs((prev) => [...prev, addedItem].sort((a, b) => a.date.localeCompare(b.date)));
        setNewBodyLog({
          date: new Date().toISOString().split('T')[0],
          fat_percentage: '',
          chest: '',
          waist: '',
          hips: '',
          biceps: '',
          thighs: '',
        });
      }
    } catch (err: any) {
      console.error('Error guardando medidas:', err);
      alert(`Error al guardar medidas corporales: ${err.message || err}`);
    }
  };

  const handleDeleteBodyLog = async (id: string) => {
    try {
      const { error } = await supabase.from('body_metrics_logs').delete().eq('id', id);
      if (error) throw error;
      setBodyLogs((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Error eliminando registro de medidas:', err);
    }
  };

  const reversedLogs = useMemo(() => [...logs].reverse(), [logs]);
  const reversedBodyLogs = useMemo(() => [...bodyLogs].reverse(), [bodyLogs]);

  const latestWeight = logs.length > 0 ? logs[logs.length - 1].weight : Number(profile.initial_weight) || 0;
  const initialWeight = Number(profile.initial_weight) || 0;
  const weightDiff = initialWeight > 0 && latestWeight > 0 ? (latestWeight - initialWeight).toFixed(1) : '0';

  const latestBodyLog = bodyLogs.length > 0 ? bodyLogs[bodyLogs.length - 1] : null;

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Cargando métricas...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER TÍTULO Y PERFIL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Métricas Corporales</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control de composición corporal, perímetros y avance de peso en el tiempo.
          </p>
        </div>
        <button
          onClick={() => (editingProfile ? handleSaveProfile() : setEditingProfile(true))}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-brand-600 shadow-sm shadow-brand-500/30 transition-all w-fit cursor-pointer"
        >
          {editingProfile ? <Check size={16} /> : <Edit2 size={16} />}
          <span>{editingProfile ? 'Guardar Perfil' : 'Editar Datos Base'}</span>
        </button>
      </div>

      {/* GUÍA DEL USUARIO */}
      <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4 flex items-start gap-3.5">
        <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500 shrink-0">
          <Info size={20} />
        </div>
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">Control preciso de tu progreso</p>
          Registra tus datos de peso e indicadores corporales periódicamente. Las medidas antropométricas te permitirán evaluar aumentos de masa muscular o pérdida de grasa independientemente de la báscula.
        </div>
      </div>

      {/* DATOS DEL PERFIL */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Estatura</label>
            {editingProfile ? (
              <input
                type="number"
                value={profile.height}
                onChange={(e) => setProfile({ ...profile, height: e.target.value ? Number(e.target.value) : '' })}
                placeholder="cm (ej: 175)"
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <div>
                <p className="mt-1 text-xl font-bold">{profile.height ? `${profile.height} cm` : '--'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Estatura de referencia</p>
              </div>
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
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <div>
                <p className="mt-1 text-xl font-bold">{profile.age ? `${profile.age} años` : '--'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Edad cronológica</p>
              </div>
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
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            ) : (
              <div>
                <p className="mt-1 text-xl font-bold">{profile.initial_weight ? `${profile.initial_weight} kg` : '--'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Punto de partida</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Objetivo</label>
            {editingProfile ? (
              <select
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="Perder Peso">Perder Peso / Definición</option>
                <option value="Ganar Masa Muscular">Ganar Masa Muscular</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Recomposición Corporal">Recomposición Corporal</option>
              </select>
            ) : (
              <div>
                <p className="mt-1 text-base font-bold text-brand-500">{profile.goal}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Target size={12} /> Meta principal
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SELECTOR DE PESTAÑAS (PESO VS MEDIDAS) */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('weight')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'weight'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Scale size={18} />
          <span>Peso Corporal</span>
        </button>
        <button
          onClick={() => setActiveTab('measurements')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'measurements'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Ruler size={18} />
          <span>Medidas & Perímetros</span>
        </button>
      </div>

      {/* SECCIÓN 1: PESO CORPORAL */}
      {activeTab === 'weight' && (
        <div className="space-y-8 animate-fade-in">
          {/* KPIS DE PROGRESO DE PESO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase">Peso Inicial</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold">{initialWeight || '--'}</span>
                <span className="text-sm font-medium text-gray-500">kg</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
              <p className="text-xs font-semibold text-gray-400 uppercase">Peso Actual</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-brand-500">{latestWeight || '--'}</span>
                <span className="text-sm font-medium text-gray-500">kg</span>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
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

          {/* FORMULARIO REGISTRO PESO */}
          <form onSubmit={handleAddWeight} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Scale size={18} className="text-brand-500" />
                <span>Registrar Nuevo Peso</span>
              </h3>
              <span className="text-xs text-gray-400 hidden sm:inline">Recomendado: Pesarse en ayunas</span>
            </div>
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
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</label>
                <input
                  type="date"
                  required
                  value={newWeightDate}
                  onChange={(e) => setNewWeightDate(e.target.value)}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white px-6 text-sm font-semibold hover:bg-brand-600 shadow-sm shadow-brand-500/30 transition-all cursor-pointer"
              >
                <Plus size={18} />
                <span>Guardar Peso</span>
              </button>
            </div>
          </form>

          {/* GRÁFICO Y TABLA PESO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-base font-bold">Evolución en el Tiempo</h3>
                <p className="text-xs text-gray-500">Línea punteada muestra tu Peso Inicial de referencia.</p>
              </div>
              {logs.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={logs} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={formatChartDate}
                        tick={{ fill: axisColor, fontSize: 12 }} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      {initialWeight > 0 && (
                        <ReferenceLine y={initialWeight} stroke="#888" strokeDasharray="3 3" label={{ value: 'Inicial', fill: '#888', fontSize: 10 }} />
                      )}
                      <Area
                        type="monotone"
                        dataKey="weight"
                        name="Peso"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        fill="url(#weightGradient)"
                        dot={{ fill: '#f97316', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-xs text-gray-400">
                  Ingresa al menos un registro de peso para generar el gráfico.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <h3 className="text-base font-bold mb-4">Historial de Pesajes</h3>
              {reversedLogs.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1 no-scrollbar">
                  {reversedLogs.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <p className="text-sm font-bold">{item.weight} kg</p>
                          <p className="text-xs text-gray-400">{formatChartDate(item.date)}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteWeightLog(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
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
      )}

      {/* SECCIÓN 2: MEDIDAS Y PERÍMETROS */}
      {activeTab === 'measurements' && (
        <div className="space-y-8 animate-fade-in">
          {/* KPIS DE MEDIDAS ULTIMAS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Grasa %</p>
              <p className="text-xl font-bold mt-1 text-brand-500">
                {latestBodyLog?.fat_percentage ? `${latestBodyLog.fat_percentage}%` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Pecho</p>
              <p className="text-xl font-bold mt-1">
                {latestBodyLog?.chest ? `${latestBodyLog.chest} cm` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Cintura</p>
              <p className="text-xl font-bold mt-1">
                {latestBodyLog?.waist ? `${latestBodyLog.waist} cm` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Cadera</p>
              <p className="text-xl font-bold mt-1">
                {latestBodyLog?.hips ? `${latestBodyLog.hips} cm` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Bíceps</p>
              <p className="text-xl font-bold mt-1">
                {latestBodyLog?.biceps ? `${latestBodyLog.biceps} cm` : '--'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
              <p className="text-[11px] font-semibold text-gray-400 uppercase">Muslos</p>
              <p className="text-xl font-bold mt-1">
                {latestBodyLog?.thighs ? `${latestBodyLog.thighs} cm` : '--'}
              </p>
            </div>
          </div>

          {/* FORMULARIO DE MEDIDAS */}
          <form onSubmit={handleAddBodyLog} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Activity size={18} className="text-brand-500" />
                <span>Registrar Nuevas Medidas</span>
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</label>
                <input
                  type="date"
                  required
                  value={newBodyLog.date}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, date: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">% Grasa</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="%"
                  value={newBodyLog.fat_percentage}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, fat_percentage: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Pecho (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={newBodyLog.chest}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, chest: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cintura (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={newBodyLog.waist}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, waist: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Cadera (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={newBodyLog.hips}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, hips: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Bíceps (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={newBodyLog.biceps}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, biceps: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Muslos (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="cm"
                  value={newBodyLog.thighs}
                  onChange={(e) => setNewBodyLog({ ...newBodyLog, thighs: e.target.value })}
                  className="mt-1 w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 box-border"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white px-4 text-sm font-semibold hover:bg-brand-600 shadow-sm shadow-brand-500/30 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Guardar</span>
                </button>
              </div>
            </div>
          </form>

          {/* HISTORIAL DE MEDIDAS */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6 shadow-sm">
            <h3 className="text-base font-bold mb-4">Historial de Medidas Corporales</h3>
            {reversedBodyLogs.length > 0 ? (
              <>
                <div className="block md:hidden space-y-3">
                  {reversedBodyLogs.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-brand-500" />
                          <span className="text-sm font-bold">{formatChartDate(item.date)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBodyLog(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Eliminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Grasa</p>
                          <p className="font-bold text-brand-500 mt-0.5">{item.fat_percentage ? `${item.fat_percentage}%` : '-'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Pecho</p>
                          <p className="font-bold mt-0.5">{item.chest ? `${item.chest} cm` : '-'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Cintura</p>
                          <p className="font-bold mt-0.5">{item.waist ? `${item.waist} cm` : '-'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Cadera</p>
                          <p className="font-bold mt-0.5">{item.hips ? `${item.hips} cm` : '-'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Bíceps</p>
                          <p className="font-bold mt-0.5">{item.biceps ? `${item.biceps} cm` : '-'}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Muslos</p>
                          <p className="font-bold mt-0.5">{item.thighs ? `${item.thighs} cm` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase">
                        <th className="pb-3 px-2">Fecha</th>
                        <th className="pb-3 px-2">Grasa %</th>
                        <th className="pb-3 px-2">Pecho</th>
                        <th className="pb-3 px-2">Cintura</th>
                        <th className="pb-3 px-2">Cadera</th>
                        <th className="pb-3 px-2">Bíceps</th>
                        <th className="pb-3 px-2">Muslos</th>
                        <th className="pb-3 px-2 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reversedBodyLogs.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-2 font-semibold whitespace-nowrap">{formatChartDate(item.date)}</td>
                          <td className="py-3 px-2 text-brand-500 font-bold whitespace-nowrap">{item.fat_percentage ? `${item.fat_percentage}%` : '-'}</td>
                          <td className="py-3 px-2 whitespace-nowrap">{item.chest ? `${item.chest} cm` : '-'}</td>
                          <td className="py-3 px-2 whitespace-nowrap">{item.waist ? `${item.waist} cm` : '-'}</td>
                          <td className="py-3 px-2 whitespace-nowrap">{item.hips ? `${item.hips} cm` : '-'}</td>
                          <td className="py-3 px-2 whitespace-nowrap">{item.biceps ? `${item.biceps} cm` : '-'}</td>
                          <td className="py-3 px-2 whitespace-nowrap">{item.thighs ? `${item.thighs} cm` : '-'}</td>
                          <td className="py-3 px-2 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteBodyLog(item.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400">No hay registros antropométricos aún.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
