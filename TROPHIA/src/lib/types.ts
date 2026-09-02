export type ID = string;

export type MuscleGroup = 'Pecho' | 'Espalda' | 'Piernas' | 'Hombros' | 'Brazos' | 'Core' | 'Glúteos' | 'Cardio';

export interface Exercise {
  id: ID;
  name: string;
  muscleGroup: MuscleGroup;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoutineExercise {
  exerciseId: ID;
  // Campos de Fuerza (opcionales para cardio)
  sets?: number;
  targetReps?: number;
  restSeconds?: number;
  // Campos de Cardio (opcionales para fuerza)
  cardioType?: string;
  durationMinutes?: number;
  distanceKm?: number;
}

export interface Routine {
  id: ID;
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
  routineId: ID | null;
  routineName: string;
  date: number;
  exercises: SessionExercise[];
  notes?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
}

export type MutationOp =
  | { kind: 'upsert'; table: 'exercises' | 'routines' | 'sessions'; record: Record<string, unknown> }
  | { kind: 'delete'; table: 'exercises' | 'routines' | 'sessions'; id: ID };

export interface MutationQueueEntry {
  id: ID;
  op: MutationOp;
  createdAt: number;
  synced: 0 | 1;
}
