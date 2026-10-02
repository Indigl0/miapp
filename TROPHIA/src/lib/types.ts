export type ID = string;

export interface Exercise {
  id: ID;
  name: string;
  muscleGroup: string;
  userId?: ID;
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
  name: string;
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
