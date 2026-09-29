export type ID = string;

export type MuscleGroup = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Core' | 'Glúteos' | 'Cardio';

export interface Exercise {
  id: ID;
  userId?: string; // Asociación opcional u obligatoria según tu modelo
  name: string;
  muscleGroup: MuscleGroup;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineExercise {
  exerciseId: ID;
  sets?: number;
  targetReps?: number;
  restSeconds?: number;
  cardioType?: string;
  durationMinutes?: number;
  distanceKm?: number;
}

export interface Routine {
  id: ID;
  userId: string; // <-- AÑADIDO: Asocia la rutina al usuario que la creó
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface SessionSet {
  setNumber: number;
  reps: number;
  weight: number;
  rir?: number;
  completed: boolean;
}

export interface SessionCardioDetails {
  cardioType: string;
  durationMinutes: number;
  distanceKm?: number;
  completed: boolean;
}

export interface SessionExercise {
  exerciseId: ID;
  sets?: SessionSet[];
  cardioDetails?: SessionCardioDetails;
}

export interface TrainingSession {
  id: ID;
  userId: string; // <-- AÑADIDO: Asocia la sesión de entrenamiento al usuario
  routineId: ID | null;
  routineName: string;
  date: number;
  exercises: SessionExercise[];
  notes?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number; // Protege la papelera
}

export type MutationOp =
  | { kind: 'upsert'; table: 'exercises' | 'routines' | 'sessions' | 'metrics'; record: Record<string, unknown> }
  | { kind: 'delete'; table: 'exercises' | 'routines' | 'sessions' | 'metrics'; id: ID };

export interface MutationQueueEntry {
  id: ID;
  op: MutationOp;
  createdAt: number;
  synced: 0 | 1;
}

// --- TIPOS AÑADIDOS PARA MÉTRICAS Y BACKUP JSON ---

export interface BodyMetric {
  id: ID;
  userId: string; // <-- AÑADIDO: Asocia las métricas corporales al usuario
  date: number; // Timestamp
  weightKg?: number;
  bodyFatPercentage?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepsCm?: number;
  thighsCm?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  exercises: Exercise[];
  routines: Routine[];
  sessions: TrainingSession[];
  metrics: BodyMetric[];
}
