export type ID = string;

export interface Exercise {
  id: ID;
  name: string;
  muscleGroup: string;
  userId?: ID;
  user_id?: ID; // Soporte para nomenclatura snake_case de Supabase/vistas
}

export interface RoutineExercise {
  exerciseId: ID;
  sets?: number;
  targetReps?: number;
  restSeconds?: number;
  cardioType?: string;
  durationMinutes?: number;
}

export interface Routine {
  id: ID;
  userId: ID;
  user_id?: ID; // Soporte para nomenclatura snake_case
  name: string;
  description?: string; // Campo opcional para las notas/descripción de la rutina
  exercises: RoutineExercise[];
  createdAt?: number;
  updatedAt?: number;
}

export interface SessionSet {
  setNumber?: number;
  weight?: number;
  reps?: number;
  rir?: number;
  completed?: boolean;
}

export interface SessionCardioDetails {
  cardioType?: string;
  completed?: boolean;
  durationMinutes?: number;
  distanceKm?: number;
}

export interface SessionExercise {
  exerciseId: ID;
  sets?: SessionSet[];
  cardioDetails?: SessionCardioDetails;
  notes?: string;
}

export interface TrainingSession {
  id: ID;
  userId: ID;
  user_id?: ID;
  routineId?: ID | null;
  routineName?: string;
  date: number;
  completed?: boolean;
  deletedAt?: number | null;
  exercises?: SessionExercise[];
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface MutationQueueEntry {
  id: ID;
  kind: 'upsert' | 'delete';
  table: string;
  record?: Record<string, unknown>;
  timestamp?: number;
  synced?: boolean; // Añadido para que coincida con el índice de db.ts
}

export interface BodyMetric {
  id: ID;
  userId: ID;
  user_id?: ID;
  date: number;
  weight?: number;
  bodyFatPercentage?: number;
  notes?: string;
  createdAt?: number;
  updatedAt?: number;
}
