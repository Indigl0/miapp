


/** 

import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Calendar } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import type { TrainingSession, Exercise } from '@/lib/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Feedback';
import { useTheme } from '@/lib/theme';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

function fmtDate(ts: number): string { return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }); }

interface DayVolume { date: string; timestamp: number; volume: number; sets: number; }
interface ExerciseProgress { date: string; timestamp: number; weight: number; volume: number; }
interface MuscleDistribution { group: string; volume: number; }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl px-3.5 py-2.5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 break-words">{label}</p>
      {payload.map((p, i) => <p key={i} className="text-sm font-bold break-words" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString('es-ES')}</p>)}
    </div>
  );
}

export function AnalyticsView() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as TrainingSession[]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  const [theme] = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  const completedSessions = useMemo(() => sessions.filter((s) => s.completed), [sessions]);

  const dailyVolume = useMemo<DayVolume[]>(() => {
    const map = new Map<number, DayVolume>();
    completedSessions.forEach((s) => {
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const ts = day.getTime();
      const vol = s.exercises.reduce((sum, ex) => sum + ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0), 0);
      const sets = s.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.completed).length, 0);
      const existing = map.get(ts);
      if (existing) { existing.volume += vol; existing.sets += sets; }
      else map.set(ts, { date: fmtDate(ts), timestamp: ts, volume: Math.round(vol), sets });
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions]);

  const muscleDistribution = useMemo<MuscleDistribution[]>(() => {
    const map = new Map<string, number>();
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (!exercise) return;
      const vol = ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
      map.set(exercise.muscleGroup, (map.get(exercise.muscleGroup) ?? 0) + vol);
    }));
    return Array.from(map.entries()).map(([group, volume]) => ({ group, volume: Math.round(volume) })).filter((d) => d.volume > 0).sort((a, b) => b.volume - a.volume);
  }, [completedSessions, exercises]);

  const exerciseProgress = useMemo<ExerciseProgress[]>(() => {
    const map = new Map<number, ExerciseProgress>();
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      if (selectedExercise !== 'all' && ex.exerciseId !== selectedExercise) return;
      const topWeight = Math.max(...ex.sets.filter((set) => set.completed).map((set) => set.weight), 0);
      const vol = ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
      if (topWeight === 0 && vol === 0) return;
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const ts = day.getTime();
      const existing = map.get(ts);
      if (existing) { existing.weight = Math.max(existing.weight, topWeight); existing.volume += vol; }
      else map.set(ts, { date: fmtDate(ts), timestamp: ts, weight: topWeight, volume: Math.round(vol) });
    }));
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions, selectedExercise]);

  const totalVolume = dailyVolume.reduce((sum, d) => sum + d.volume, 0);
  const totalSets = dailyVolume.reduce((sum, d) => sum + d.sets, 0);
  const avgWeight = exerciseProgress.length > 0 ? exerciseProgress.reduce((sum, d) => sum + d.weight, 0) / exerciseProgress.length : 0;

  if (completedSessions.length === 0) {
    return (
      <div className="space-y-6">
        <div><h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento</h2></div>
        <Card><EmptyState icon={<Activity size={32} />} title="Sin datos para analizar" description="Completa al menos una sesión de entrenamiento para ver tus gráficos de progreso." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2"><BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Visualiza tu progreso de volumen y fuerza a lo largo del tiempo.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Activity size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{completedSessions.length}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Sesiones</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><TrendingUp size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalVolume.toLocaleString('es-ES')}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Volumen kg</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><TrendingUp size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalSets}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Series</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Calendar size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{avgWeight.toFixed(1)}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Peso prom.</p></CardBody></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Volumen de Entrenamiento</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs><linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.4} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" name="Volumen (kg)" stroke="#f97316" strokeWidth={2.5} fill="url(#volGradient)" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Distribución por Grupo Muscular</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={muscleDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                <defs><linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="group" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#ffffff08' : '#00000005' }} />
                <Bar dataKey="volume" name="Volumen (kg)" fill="url(#barGradient)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>Progreso de Fuerza</CardTitle>
              <Select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="w-auto min-w-[140px] sm:min-w-[160px] h-9 py-1.5">
                <option value="all">Todos los ejercicios</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {exerciseProgress.length === 0 ? <p className="text-sm text-gray-400 text-center py-16 break-words">Sin datos para este ejercicio.</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={exerciseProgress} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" name="Peso máx (kg)" stroke="#10b981" strokeWidth={2.5} fill="url(#weightGradient)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="volume" name="Volumen (kg)" stroke="#f97316" strokeWidth={2} fillOpacity={0} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
*/




import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, Activity, Calendar, FileDown, Dumbbell } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import type { TrainingSession, Exercise } from '@/lib/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/Feedback';
import { useTheme } from '@/lib/theme';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';

function fmtDate(ts: number): string { return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }

interface DayVolume { date: string; timestamp: number; volume: number; sets: number; }
interface ExerciseProgress { date: string; timestamp: number; weight: number; volume: number; }
interface MuscleDistribution { group: string; volume: number; }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl px-3.5 py-2.5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 break-words">{label}</p>
      {payload.map((p, i) => <p key={i} className="text-sm font-bold break-words" style={{ color: p.color }}>{p.name}: {p.value.toLocaleString('es-ES')}</p>)}
    </div>
  );
}

export function AnalyticsView() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as TrainingSession[]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  const [theme] = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#6b7280' : '#9ca3af';
  const gridColor = isDark ? '#1f2937' : '#f3f4f6';
  
  // Sesiones completadas ordenadas de la más reciente a la más antigua
  const completedSessions = useMemo(() => 
    sessions.filter((s) => s.completed).sort((a, b) => b.date - a.date), 
    [sessions]
  );

  const dailyVolume = useMemo<DayVolume[]>(() => {
    const map = new Map<number, DayVolume>();
    completedSessions.forEach((s) => {
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const ts = day.getTime();
      const vol = s.exercises.reduce((sum, ex) => sum + ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0), 0);
      const sets = s.exercises.reduce((sum, ex) => sum + ex.sets.filter((set) => set.completed).length, 0);
      const existing = map.get(ts);
      if (existing) { existing.volume += vol; existing.sets += sets; }
      else map.set(ts, { date: fmtDate(ts), timestamp: ts, volume: Math.round(vol), sets });
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions]);

  const muscleDistribution = useMemo<MuscleDistribution[]>(() => {
    const map = new Map<string, number>();
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (!exercise) return;
      const vol = ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
      map.set(exercise.muscleGroup, (map.get(exercise.muscleGroup) ?? 0) + vol);
    }));
    return Array.from(map.entries()).map(([group, volume]) => ({ group, volume: Math.round(volume) })).filter((d) => d.volume > 0).sort((a, b) => b.volume - a.volume);
  }, [completedSessions, exercises]);

  const exerciseProgress = useMemo<ExerciseProgress[]>(() => {
    const map = new Map<number, ExerciseProgress>();
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      if (selectedExercise !== 'all' && ex.exerciseId !== selectedExercise) return;
      const topWeight = Math.max(...ex.sets.filter((set) => set.completed).map((set) => set.weight), 0);
      const vol = ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
      if (topWeight === 0 && vol === 0) return;
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const ts = day.getTime();
      const existing = map.get(ts);
      if (existing) { existing.weight = Math.max(existing.weight, topWeight); existing.volume += vol; }
      else map.set(ts, { date: fmtDate(ts), timestamp: ts, weight: topWeight, volume: Math.round(vol) });
    }));
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions, selectedExercise]);

  const totalVolume = dailyVolume.reduce((sum, d) => sum + d.volume, 0);
  const totalSets = dailyVolume.reduce((sum, d) => sum + d.sets, 0);
  const avgWeight = exerciseProgress.length > 0 ? exerciseProgress.reduce((sum, d) => sum + d.weight, 0) / exerciseProgress.length : 0;

  if (completedSessions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento
          </h2>
        </div>
        <Card><EmptyState icon={<Activity size={32} />} title="Sin datos para analizar" description="Completa al menos una sesión de entrenamiento para ver tus gráficos de progreso." /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con el botón Exportar PDF */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Visualiza tu progreso de volumen y fuerza a lo largo del tiempo.</p>
        </div>
        
        {/* Botón Exportar PDF */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/20 text-sm cursor-pointer active:scale-95 shrink-0 print:hidden"
        >
          <FileDown size={18} />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Activity size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{completedSessions.length}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Sesiones</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><TrendingUp size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalVolume.toLocaleString('es-ES')}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Volumen kg</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><TrendingUp size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalSets}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Series</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Calendar size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{avgWeight.toFixed(1)}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Peso prom.</p></CardBody></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Volumen de Entrenamiento</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs><linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f97316" stopOpacity={0.4} /><stop offset="100%" stopColor="#f97316" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="volume" name="Volumen (kg)" stroke="#f97316" strokeWidth={2.5} fill="url(#volGradient)" dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Distribución por Grupo Muscular</CardTitle></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={muscleDistribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} layout="vertical">
                <defs><linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fb923c" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="group" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? '#ffffff08' : '#00000005' }} />
                <Bar dataKey="volume" name="Volumen (kg)" fill="url(#barGradient)" radius={[0, 8, 8, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle>Progreso de Fuerza</CardTitle>
              <Select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="w-auto min-w-[140px] sm:min-w-[160px] h-9 py-1.5">
                <option value="all">Todos los ejercicios</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {exerciseProgress.length === 0 ? <p className="text-sm text-gray-400 text-center py-16 break-words">Sin datos para este ejercicio.</p> : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={exerciseProgress} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.35} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: axisColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="weight" name="Peso máx (kg)" stroke="#10b981" strokeWidth={2.5} fill="url(#weightGradient)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="volume" name="Volumen (kg)" stroke="#f97316" strokeWidth={2} fillOpacity={0} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* HISTORIAL DETALLADO DE SESIONES (Ordenado del más reciente al más antiguo) */}
      <Card className="break-before-page">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell size={20} className="text-brand-500" />
            Historial Detallado de Sesiones
          </CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            {completedSessions.map((session) => (
              <div key={session.id} className="border-b border-gray-200 dark:border-gray-800 pb-4 last:border-b-0 last:pb-0 break-inside-avoid">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-base text-gray-900 dark:text-gray-100">
                    Entrenamiento del {fmtDate(session.date)}
                  </h4>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                    {fmtDate(session.date)}
                  </span>
                </div>
                
                <div className="space-y-2 mt-3">
                  {session.exercises.map((exItem, idx) => {
                    const exerciseMeta = exercises.find((e) => e.id === exItem.exerciseId);
                    return (
                      <div key={idx} className="text-sm bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl">
                        <span className="font-semibold text-gray-800 dark:text-gray-200 block mb-1">
                          {exerciseMeta ? exerciseMeta.name : 'Ejercicio desconocido'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {exItem.sets.map((set, setIdx) => (
                            set.completed ? (
                              <span key={setIdx} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-md text-gray-600 dark:text-gray-300">
                                Serie {setIdx + 1}: <strong className="text-brand-500">{set.weight} kg</strong> × {set.reps} reps
                              </span>
                            ) : null
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}