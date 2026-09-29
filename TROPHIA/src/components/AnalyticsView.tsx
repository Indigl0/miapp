import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Activity, Calendar, FileDown, Dumbbell, ChevronDown, ChevronUp, Flame, ChevronsDown, ChevronsUp, Zap, HelpCircle, Filter, Award } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/auth';
import type { TrainingSession, Exercise } from '@/lib/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { useTheme } from '@/lib/theme';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

function fmtDate(ts: number): number | string { 
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); 
}

function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface DayVolume { 
  date: string; 
  timestamp: number; 
  volume: number; 
  sets: number; 
  cardioMinutes: number; 
}

interface ExerciseProgress { 
  date: string; 
  timestamp: number; 
  weight: number; 
  volume: number; 
  estimated1RM: number; 
  avgRir?: number; 
  durationMinutes?: number; 
  distanceKm?: number; 
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-800 shadow-2xl p-3 min-w-[160px]">
      <p className="text-[11px] font-medium tracking-wider uppercase text-gray-400 dark:text-gray-500 mb-2 border-b border-gray-100 dark:border-gray-800/80 pb-1">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-gray-600 dark:text-gray-300 font-medium truncate">{p.name}</span>
            </div>
            <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
              {typeof p.value === 'number' && p.name.includes('RIR') ? p.value.toFixed(1) : p.value.toLocaleString('es-ES')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsistencyHeatmap({ sessions }: { sessions: TrainingSession[] }) {
  const datesSet = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach(s => {
      if (s.completed && !s.deletedAt) {
        const d = new Date(s.date);
        set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
      }
    });
    return set;
  }, [sessions]);

  const daysGrid = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 139; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      days.push({
        date: d,
        key,
        active: datesSet.has(key),
        formatted: d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });
    }
    return days;
  }, [datesSet]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar size={18} className="text-brand-500" />
          Calendario de Consistencia
        </CardTitle>
      </CardHeader>
      <CardBody>
        <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
          {daysGrid.map((day) => (
            <div
              key={day.key}
              title={`${day.formatted}: ${day.active ? 'Entrenamiento completado' : 'Sin registro'}`}
              className={`w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 ${
                day.active 
                  ? 'bg-brand-500 shadow-sm shadow-brand-500/50' 
                  : 'bg-gray-100 dark:bg-gray-800/60'
              }`}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export function AnalyticsView() {
  const { user } = useAuth();

  // FILTRADO ESTRICTO POR userId ACTIVO
  const sessions = useLiveQuery(
    () => (user?.id ? db.sessions.where('userId').equals(user.id).toArray() : Promise.resolve([])), 
    [user?.id], 
    [] as TrainingSession[]
  );

  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  const [theme] = useTheme();
  
  const [timeRange, setTimeRange] = useState<TimeRange>('3M');
  const [selectedExercise, setSelectedExercise] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [activeGroupData, setActiveGroupData] = useState<{ group: string; volume: number } | null>(null);
  const [activeExPoint, setActiveExPoint] = useState<ExerciseProgress | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(5);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const isDark = theme === 'dark';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rangeCutoff = useMemo(() => {
    if (timeRange === 'ALL') return 0;
    const now = new Date();
    if (timeRange === '1M') now.setMonth(now.getMonth() - 1);
    if (timeRange === '3M') now.setMonth(now.getMonth() - 3);
    if (timeRange === '6M') now.setMonth(now.getMonth() - 6);
    if (timeRange === '1Y') now.setFullYear(now.getFullYear() - 1);
    return now.getTime();
  }, [timeRange]);
  
  const completedSessions = useMemo(() => 
    sessions
      .filter((s) => s.completed && !s.deletedAt && s.date >= rangeCutoff)
      .sort((a, b) => b.date - a.date), 
    [sessions, rangeCutoff]
  );

  const visibleSessions = useMemo(() => 
    completedSessions.slice(0, visibleCount), 
    [completedSessions, visibleCount]
  );

  const toggleSession = useCallback((id: string) => {
    setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandAll = useCallback(() => {
    const allExpanded: Record<string, boolean> = {};
    completedSessions.forEach((s) => { allExpanded[s.id] = true; });
    setExpandedSessions(allExpanded);
  }, [completedSessions]);

  const collapseAll = useCallback(() => {
    setExpandedSessions({});
  }, []);

  const handleExportPDF = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const dailyVolume = useMemo<DayVolume[]>(() => {
    const map = new Map<number, DayVolume>();
    completedSessions.forEach((s) => {
      const day = new Date(s.date); 
      day.setHours(0, 0, 0, 0);
      const ts = day.getTime();

      let vol = 0;
      let sets = 0;
      let cardioMinutes = 0;

      s.exercises.forEach((ex) => {
        if (ex.sets) {
          vol += ex.sets.reduce((a, set) => a + (set.completed ? (set.reps || 0) * (set.weight || 0) : 0), 0);
          sets += ex.sets.filter((set) => set.completed).length;
        }
        if (ex.cardioDetails && ex.cardioDetails.completed) {
          cardioMinutes += ex.cardioDetails.durationMinutes || 0;
        }
      });

      const existing = map.get(ts);
      if (existing) { 
        existing.volume += vol; 
        existing.sets += sets; 
        existing.cardioMinutes += cardioMinutes;
      } else {
        map.set(ts, { date: String(fmtDate(ts)), timestamp: ts, volume: Math.round(vol), sets, cardioMinutes });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions]);

  const globalAvgRir = useMemo(() => {
    let totalRir = 0;
    let count = 0;
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      if (ex.sets) {
        ex.sets.forEach((set) => {
          if (set.completed && typeof set.rir === 'number') {
            totalRir += set.rir;
            count++;
          }
        });
      }
    }));
    return count > 0 ? (totalRir / count) : null;
  }, [completedSessions]);

  const muscleGroupVolume = useMemo(() => {
    const map = new Map<string, number>();
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      const exercise = exercises.find((e) => e.id === ex.exerciseId);
      if (!exercise || !exercise.muscleGroup) return;

      const group = exercise.muscleGroup;
      if (ex.sets) {
        const vol = ex.sets.reduce((a, set) => a + (set.completed ? (set.reps || 0) * (set.weight || 0) : 0), 0);
        map.set(group, (map.get(group) || 0) + vol);
      }
    }));

    return Array.from(map.entries())
      .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume);
  }, [completedSessions, exercises]);

  const exerciseProgress = useMemo<ExerciseProgress[]>(() => {
    const map = new Map<number, { weight: number; volume: number; durationMinutes: number; distanceKm: number; rirSum: number; rirCount: number; max1RM: number }>();
    
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      if (selectedExercise !== 'all' && ex.exerciseId !== selectedExercise) return;
      
      const day = new Date(s.date); 
      day.setHours(0, 0, 0, 0);
      const ts = day.getTime();

      if (ex.cardioDetails) {
        if (!ex.cardioDetails.completed) return;
        const existing = map.get(ts);
        const mins = ex.cardioDetails.durationMinutes || 0;
        const dist = ex.cardioDetails.distanceKm || 0;
        if (existing) {
          existing.durationMinutes += mins;
          existing.distanceKm += dist;
        } else {
          map.set(ts, { weight: 0, volume: 0, durationMinutes: mins, distanceKm: dist, rirSum: 0, rirCount: 0, max1RM: 0 });
        }
      } else if (ex.sets) {
        const completedSets = ex.sets.filter((set) => set.completed);
        const topWeight = Math.max(...completedSets.map((set) => set.weight || 0), 0);
        const vol = completedSets.reduce((a, set) => a + (set.reps || 0) * (set.weight || 0), 0);
        
        let dayMax1RM = 0;
        let rirSum = 0;
        let rirCount = 0;
        completedSets.forEach((set) => {
          const estimated = calculate1RM(set.weight || 0, set.reps || 0);
          if (estimated > dayMax1RM) dayMax1RM = estimated;

          if (typeof set.rir === 'number') {
            rirSum += set.rir;
            rirCount++;
          }
        });

        if (topWeight === 0 && vol === 0) return;
        
        const existing = map.get(ts);
        if (existing) { 
          existing.weight = Math.max(existing.weight, topWeight); 
          existing.volume += vol; 
          existing.max1RM = Math.max(existing.max1RM, dayMax1RM);
          existing.rirSum += rirSum;
          existing.rirCount += rirCount;
        } else {
          map.set(ts, { weight: topWeight, volume: Math.round(vol), durationMinutes: 0, distanceKm: 0, rirSum, rirCount, max1RM: dayMax1RM });
        }
      }
    }));

    return Array.from(map.entries())
      .map(([ts, data]) => ({
        date: String(fmtDate(ts)),
        timestamp: ts,
        weight: data.weight,
        volume: data.volume,
        estimated1RM: data.max1RM,
        durationMinutes: data.durationMinutes || undefined,
        distanceKm: data.distanceKm || undefined,
        avgRir: data.rirCount > 0 ? Number((data.rirSum / data.rirCount).toFixed(1)) : undefined
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions, selectedExercise]);

  const maxOverall1RM = useMemo(() => {
    if (exerciseProgress.length === 0) return 0;
    return Math.max(...exerciseProgress.map((p) => p.estimated1RM));
  }, [exerciseProgress]);

  const totalVolume = useMemo(() => dailyVolume.reduce((sum, d) => sum + d.volume, 0), [dailyVolume]);
  const totalSets = useMemo(() => dailyVolume.reduce((sum, d) => sum + d.sets, 0), [dailyVolume]);
  const totalCardioMinutes = useMemo(() => dailyVolume.reduce((sum, d) => sum + d.cardioMinutes, 0), [dailyVolume]);

  const currentExercise = useMemo(() => exercises.find((e) => e.id === selectedExercise), [exercises, selectedExercise]);
  const isSelectedCardio = currentExercise?.muscleGroup === 'Cardio';
  const currentExerciseName = selectedExercise === 'all' 
    ? 'Todos los ejercicios' 
    : currentExercise?.name ?? 'Seleccionar ejercicio';

  const handleBarHover = useCallback((index: number | null, group?: string, volume?: number) => {
    setActiveBarIndex(index);
    if (group !== undefined && volume !== undefined) {
      setActiveGroupData({ group, volume });
    } else {
      setActiveGroupData(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Estadísticas exclusivas del usuario actual.</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-md text-xs sm:text-sm cursor-pointer"
        >
          <FileDown size={16} />
          Exportar PDF
        </button>
      </div>

      {/* Métricas KPI y Gráficos */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card><CardBody className="text-center py-4"><Activity size={18} className="text-brand-500 mx-auto mb-1" /><p className="text-xl font-bold">{completedSessions.length}</p><p className="text-xs text-gray-400">Sesiones</p></CardBody></Card>
        <Card><CardBody className="text-center py-4"><TrendingUp size={18} className="text-brand-500 mx-auto mb-1" /><p className="text-xl font-bold">{totalVolume.toLocaleString('es-ES')}</p><p className="text-xs text-gray-400">Volumen kg</p></CardBody></Card>
        <Card><CardBody className="text-center py-4"><Dumbbell size={18} className="text-brand-500 mx-auto mb-1" /><p className="text-xl font-bold">{totalSets}</p><p className="text-xs text-gray-400">Series</p></CardBody></Card>
        <Card><CardBody className="text-center py-4"><Award size={18} className="text-amber-500 mx-auto mb-1" /><p className="text-xl font-bold">{maxOverall1RM} kg</p><p className="text-xs text-gray-400">1RM Máx</p></CardBody></Card>
        <Card><CardBody className="text-center py-4"><Zap size={18} className="text-purple-500 mx-auto mb-1" /><p className="text-xl font-bold">{globalAvgRir !== null ? globalAvgRir.toFixed(1) : 'N/A'}</p><p className="text-xs text-gray-400">RIR Prom</p></CardBody></Card>
        <Card><CardBody className="text-center py-4"><Flame size={18} className="text-blue-500 mx-auto mb-1" /><p className="text-xl font-bold">{totalCardioMinutes}m</p><p className="text-xs text-gray-400">Cardio</p></CardBody></Card>
      </div>

      <ConsistencyHeatmap sessions={sessions} />
    </div>
  );
}
