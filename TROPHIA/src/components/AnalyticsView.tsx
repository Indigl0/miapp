import { useMemo, useState, useRef, useEffect } from 'react';
import { BarChart3, TrendingUp, Activity, Calendar, FileDown, Dumbbell, ChevronDown, ChevronUp, Flame, ChevronsDown, ChevronsUp, Zap, HelpCircle } from 'lucide-react';
import { useLiveQuery } from '@/lib/useLiveQuery';
import { db } from '@/lib/db';
import type { TrainingSession, Exercise } from '@/lib/types';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Feedback';
import { useTheme } from '@/lib/theme';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';

function fmtDate(ts: number): string { return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }

interface DayVolume { date: string; timestamp: number; volume: number; sets: number; cardioMinutes: number; }
interface ExerciseProgress { date: string; timestamp: number; weight: number; volume: number; avgRir?: number; durationMinutes?: number; distanceKm?: number; }

// Tooltip con Glassmorphism para gráficos generales
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/80 dark:border-gray-800 shadow-2xl p-3 min-w-[160px] transition-all duration-150">
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

export function AnalyticsView() {
  const sessions = useLiveQuery(() => db.sessions.toArray(), [], [] as TrainingSession[]);
  const exercises = useLiveQuery(() => db.exercises.toArray(), [], [] as Exercise[]);
  const [theme] = useTheme();
  const [selectedExercise, setSelectedExercise] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estado para resaltar la barra enfocada y mostrar la cabecera dinámica
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);
  const [activeGroupData, setActiveGroupData] = useState<{ group: string; volume: number } | null>(null);

  // Estados para control de historial
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
  
  const completedSessions = useMemo(() => 
    sessions.filter((s) => s.completed).sort((a, b) => b.date - a.date), 
    [sessions]
  );

  const visibleSessions = useMemo(() => 
    completedSessions.slice(0, visibleCount), 
    [completedSessions, visibleCount]
  );

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    completedSessions.forEach((s) => { allExpanded[s.id] = true; });
    setExpandedSessions(allExpanded);
  };

  const collapseAll = () => {
    setExpandedSessions({});
  };

  const handleExportPDF = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const dailyVolume = useMemo<DayVolume[]>(() => {
    const map = new Map<number, DayVolume>();
    completedSessions.forEach((s) => {
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
      const ts = day.getTime();

      let vol = 0;
      let sets = 0;
      let cardioMinutes = 0;

      s.exercises.forEach((ex) => {
        if (ex.sets) {
          vol += ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
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
        map.set(ts, { date: fmtDate(ts), timestamp: ts, volume: Math.round(vol), sets, cardioMinutes });
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
        const vol = ex.sets.reduce((a, set) => a + (set.completed ? set.reps * set.weight : 0), 0);
        map.set(group, (map.get(group) || 0) + vol);
      }
    }));

    return Array.from(map.entries())
      .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume);
  }, [completedSessions, exercises]);

  const exerciseProgress = useMemo<ExerciseProgress[]>(() => {
    const map = new Map<number, { weight: number; volume: number; durationMinutes: number; distanceKm: number; rirSum: number; rirCount: number }>();
    
    completedSessions.forEach((s) => s.exercises.forEach((ex) => {
      if (selectedExercise !== 'all' && ex.exerciseId !== selectedExercise) return;
      
      const day = new Date(s.date); day.setHours(0, 0, 0, 0);
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
          map.set(ts, { weight: 0, volume: 0, durationMinutes: mins, distanceKm: dist, rirSum: 0, rirCount: 0 });
        }
      } else if (ex.sets) {
        const completedSets = ex.sets.filter((set) => set.completed);
        const topWeight = Math.max(...completedSets.map((set) => set.weight), 0);
        const vol = completedSets.reduce((a, set) => a + set.reps * set.weight, 0);
        
        let rirSum = 0;
        let rirCount = 0;
        completedSets.forEach((set) => {
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
          existing.rirSum += rirSum;
          existing.rirCount += rirCount;
        } else {
          map.set(ts, { weight: topWeight, volume: Math.round(vol), durationMinutes: 0, distanceKm: 0, rirSum, rirCount });
        }
      }
    }));

    return Array.from(map.entries())
      .map(([ts, data]) => ({
        date: fmtDate(ts),
        timestamp: ts,
        weight: data.weight,
        volume: data.volume,
        durationMinutes: data.durationMinutes || undefined,
        distanceKm: data.distanceKm || undefined,
        avgRir: data.rirCount > 0 ? Number((data.rirSum / data.rirCount).toFixed(1)) : undefined
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [completedSessions, selectedExercise]);

  const totalVolume = dailyVolume.reduce((sum, d) => sum + d.volume, 0);
  const totalSets = dailyVolume.reduce((sum, d) => sum + d.sets, 0);

  const currentExercise = exercises.find((e) => e.id === selectedExercise);
  const isSelectedCardio = currentExercise?.muscleGroup?.toLowerCase() === 'cardio';
  const currentExerciseName = selectedExercise === 'all' 
    ? 'Todos los ejercicios' 
    : currentExercise?.name ?? 'Seleccionar ejercicio';

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
    <div className="space-y-6 print:space-y-4">
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .recharts-responsive-container {
            width: 100% !important;
            height: 250px !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-condensed text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 size={24} className="text-brand-500" />Análisis de Rendimiento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 break-words">Visualiza tu progreso de volumen, fuerza e intensidad a lo largo del tiempo.</p>
        </div>
        
        <button
          onClick={handleExportPDF}
          type="button"
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/20 text-sm cursor-pointer active:scale-95 shrink-0 print:hidden"
        >
          <FileDown size={18} />
          Exportar PDF
        </button>
      </div>

      {/* KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Activity size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{completedSessions.length}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Sesiones</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><TrendingUp size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalVolume.toLocaleString('es-ES')}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Volumen kg</p></CardBody></Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Dumbbell size={18} className="text-brand-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{totalSets}</p><p className="text-xs text-gray-400 mt-0.5 break-words">Series Fuerza</p></CardBody></Card>
        <Card>
          <CardBody className="text-center py-3 sm:py-4">
            <div className="flex items-center justify-center mb-1"><Zap size={18} className="text-purple-500" /></div>
            <p className="text-lg sm:text-2xl font-bold break-words">
              {globalAvgRir !== null ? globalAvgRir.toFixed(1) : 'N/A'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 break-words">RIR Promedio</p>
          </CardBody>
        </Card>
        <Card><CardBody className="text-center py-3 sm:py-4"><div className="flex items-center justify-center mb-1"><Flame size={18} className="text-blue-500" /></div><p className="text-lg sm:text-2xl font-bold break-words">{dailyVolume.reduce((sum, d) => sum + d.cardioMinutes, 0)} <span className="text-xs font-normal">min</span></p><p className="text-xs text-gray-400 mt-0.5 break-words">Cardio Total</p></CardBody></Card>
      </div>

      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 flex items-start gap-3.5 print:hidden">
        <div className="p-2 bg-purple-500/10 rounded-xl text-purple-500 shrink-0 mt-0.5">
          <HelpCircle size={20} />
        </div>
        <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1.5">
            ¿Qué es el RIR y cómo ayuda a la Hipertrofia?
          </p>
          El <strong>RIR (Repeticiones En Recámara)</strong> indica cuántas repeticiones adicionales podrías haber completado antes del fallo muscular. Para maximizar la ganancia muscular (hipertrofia), el rango óptimo es un <strong>RIR entre 1 y 3</strong>.
        </div>
      </div>

      {/* GRÁFICO 1: VOLUMEN DE ENTRENAMIENTO */}
      <Card>
        <CardHeader><CardTitle>Volumen de Entrenamiento</CardTitle></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dailyVolume} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dy={5} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dx={-5} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area 
                type="monotone" 
                dataKey="volume" 
                name="Volumen (kg)" 
                stroke="#f97316" 
                strokeWidth={2.5} 
                fill="url(#volGradient)" 
                dot={{ fill: '#f97316', r: 3, strokeWidth: 2, stroke: isDark ? '#111827' : '#ffffff' }} 
                activeDot={{ r: 6, strokeWidth: 0, fill: '#f97316' }} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      {/* FILA DE GRÁFICOS SECUNDARIOS */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* GRÁFICO 2: DISTRIBUCIÓN POR GRUPO MUSCULAR */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full min-h-[42px]">
              <div>
                <CardTitle>Distribución por Grupo Muscular</CardTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">Pasa el cursor o toca sobre las barras para consultar</p>
              </div>

              {/* Indicador Fijo */}
              {activeGroupData ? (
                <div className="text-right bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-xl animate-fade-in shrink-0">
                  <span className="text-[10px] font-bold text-brand-500 uppercase block leading-none">{activeGroupData.group}</span>
                  <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white leading-tight">
                    {activeGroupData.volume.toLocaleString('es-ES')} <span className="text-[10px] font-medium text-gray-400">kg</span>
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 italic shrink-0">Pasa el cursor para ver datos</div>
              )}
            </div>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                layout="vertical" 
                data={muscleGroupVolume} 
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                onMouseLeave={() => {
                  setActiveBarIndex(null);
                  setActiveGroupData(null);
                }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dy={5} />
                <YAxis dataKey="group" type="category" tick={{ fill: axisColor, fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} width={75} />
                <Tooltip content={() => null} cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }} />
                <Bar 
                  dataKey="volume" 
                  name="Volumen Total (kg)" 
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                  isAnimationActive={false}
                >
                  {muscleGroupVolume.map((entry, index) => {
                    const isHovered = activeBarIndex === index;
                    const isAnyHovered = activeBarIndex !== null;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill="#f97316"
                        fillOpacity={!isAnyHovered || isHovered ? 1 : 0.35}
                        className="transition-all duration-150 cursor-pointer"
                        onMouseEnter={() => {
                          setActiveBarIndex(index);
                          setActiveGroupData({ group: entry.group, volume: entry.volume });
                        }}
                        onTouchStart={() => {
                          setActiveBarIndex(index);
                          setActiveGroupData({ group: entry.group, volume: entry.volume });
                        }}
                        style={{
                          filter: isHovered ? 'drop-shadow(0px 0px 6px rgba(249, 115, 22, 0.6))' : 'none',
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        
        {/* GRÁFICO 3: PROGRESO DE FUERZA Y RIR */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
              <CardTitle>{isSelectedCardio ? 'Progreso de Cardio' : 'Progreso de Fuerza y RIR'}</CardTitle>
              
              <div className="relative w-full sm:w-64 print:hidden" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <span className="text-left whitespace-normal break-words leading-tight py-0.5">
                    {currentExerciseName}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto py-1.5">
                    <button
                      type="button"
                      onClick={() => { setSelectedExercise('all'); setIsDropdownOpen(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between ${selectedExercise === 'all' ? 'text-brand-500 font-semibold bg-brand-50/50 dark:bg-brand-950/30' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      <span className="whitespace-normal break-words">Todos los ejercicios</span>
                    </button>
                    {exercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => { setSelectedExercise(ex.id); setIsDropdownOpen(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-xs sm:text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 ${selectedExercise === ex.id ? 'text-brand-500 font-semibold bg-brand-50/50 dark:bg-brand-950/30' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        <span className="whitespace-normal break-words leading-snug">{ex.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {exerciseProgress.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16 break-words">Sin datos para este ejercicio.</p>
            ) : isSelectedCardio ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={exerciseProgress} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cardioGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dy={5} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dx={-5} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="durationMinutes" name="Tiempo (min)" stroke="#3b82f6" strokeWidth={2.5} fill="url(#cardioGradient)" dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="distanceKm" name="Distancia (km)" stroke="#10b981" strokeWidth={2} fillOpacity={0} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={exerciseProgress} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dy={5} />
                  <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dx={-5} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 3]} tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} dx={5} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: axisColor, strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="weight" name="Peso máx (kg)" stroke="#10b981" strokeWidth={2.5} fill="url(#weightGradient)" dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                  <Area yAxisId="left" type="monotone" dataKey="volume" name="Volumen (kg)" stroke="#f97316" strokeWidth={2} fillOpacity={0} dot={false} />
                  <Area yAxisId="right" type="monotone" dataKey="avgRir" name="RIR Promedio" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" fillOpacity={0} dot={{ fill: '#a855f7', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* HISTORIAL DETALLADO */}
      <Card className="break-before-page">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell size={20} className="text-brand-500" />
                Historial Detallado de Sesiones
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 print:hidden">
                Mostrando {Math.min(visibleCount, completedSessions.length)} de {completedSessions.length} sesiones completadas.
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={expandAll}
                className="flex items-center gap-2 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs sm:text-sm cursor-pointer active:scale-95"
                title="Desplegar todas las sesiones"
              >
                <ChevronsDown size={16} />
                <span>Desplegar todo</span>
              </button>

              <button
                type="button"
                onClick={collapseAll}
                className="flex items-center gap-2 px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl transition-all shadow-md shadow-brand-500/20 text-xs sm:text-sm cursor-pointer active:scale-95"
                title="Colapsar todas las sesiones"
              >
                <ChevronsUp size={16} />
                <span>Colapsar todo</span>
              </button>
            </div>
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-3 print:hidden">
            {visibleSessions.map((session) => {
              const isOpen = !!expandedSessions[session.id];
              return (
                <div key={session.id} className="border border-gray-200 dark:border-gray-800/80 rounded-2xl overflow-hidden transition-all duration-200 bg-white dark:bg-gray-900/40 hover:border-brand-500/30">
                  <button
                    type="button"
                    onClick={() => toggleSession(session.id)}
                    className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="h-9 w-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 font-bold text-xs">
                        <Calendar size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                          {session.routineName}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {fmtDate(session.date)}
                          </span>
                          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
                            {session.exercises.length} ejercicios
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-brand-500 hidden sm:inline-block">
                        {isOpen ? 'Ocultar' : 'Ver detalle'}
                      </span>
                      <div className={`p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-500' : ''}`}>
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-3.5 sm:p-4 pt-0 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-950/20 space-y-2.5 animate-fade-in">
                      {session.exercises.map((exItem, idx) => {
                        const exerciseMeta = exercises.find((e) => e.id === exItem.exerciseId);
                        return (
                          <div key={idx} className="text-sm bg-white dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800/80 p-3 rounded-xl shadow-2xs">
                            <span className="font-bold text-gray-800 dark:text-gray-200 block mb-2 text-xs sm:text-sm">
                              {exerciseMeta ? exerciseMeta.name : 'Ejercicio desconocido'}
                            </span>
                            
                            {exItem.cardioDetails ? (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-300 font-medium">
                                  {exItem.cardioDetails.cardioType} · {exItem.cardioDetails.durationMinutes} min {exItem.cardioDetails.distanceKm ? `· ${exItem.cardioDetails.distanceKm} km` : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                {exItem.sets?.map((set, setIdx) => (
                                  set.completed ? (
                                    <span key={setIdx} className="text-xs bg-gray-50 dark:bg-gray-800/80 border border-gray-200/80 dark:border-gray-700/60 px-2.5 py-1 rounded-lg text-gray-700 dark:text-gray-300">
                                      Serie {setIdx + 1}: <strong className="text-brand-500">{set.weight} kg</strong> × {set.reps} reps {typeof set.rir === 'number' ? <span className="text-purple-500 font-semibold ml-1">({set.rir === 3 ? '3+' : set.rir} RIR)</span> : null}
                                    </span>
                                  ) : null
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {completedSessions.length > visibleCount && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 5)}
                className="w-full sm:w-auto px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <ChevronDown size={16} />
                <span>Mostrar más ({completedSessions.length - visibleCount} restantes)</span>
              </button>

              <button
                type="button"
                onClick={() => setVisibleCount(completedSessions.length)}
                className="w-full sm:w-auto px-5 py-2.5 border border-brand-500/30 text-brand-500 hover:bg-brand-500/10 font-semibold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>Mostrar todas</span>
              </button>
            </div>
          )}

          {visibleCount > 5 && (
            <div className="mt-3 text-center print:hidden">
              <button
                type="button"
                onClick={() => setVisibleCount(5)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <ChevronUp size={14} />
                <span>Contraer lista a las 5 más recientes</span>
              </button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
