export type ID = string;

export type MuscleGroup =
  | 'Pecho'
  | 'Espalda'
  | 'Piernas'
  | 'Hombros'
  | 'Brazos'
  | 'Core'
  | 'Glúteos'
  | 'Cardio';

export interface Exercise {
  id: ID;
  userId?: string;
  user_id?: string; // Compatibilidad con esquemas legacy
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
  userId: string;
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
  userId: string;
  routineId: ID | null;
  routineName: string;
  date: number;
  exercises: SessionExercise[];
  notes?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export type MutationOp =
  | {
      kind: 'upsert';
      table: 'exercises' | 'routines' | 'sessions' | 'metrics';
      record: Record<string, unknown>;
    }
  | {
      kind: 'delete';
      table: 'exercises' | 'routines' | 'sessions' | 'metrics';
      id: ID;
    };

export interface MutationQueueEntry {
  id: ID;
  op: MutationOp;
  createdAt: number;
  synced: 0 | 1;
}

export interface BodyMetric {
  id: ID;
  userId: string;
  date: number;
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
