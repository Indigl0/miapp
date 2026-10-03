import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, TrainingSession, MutationQueueEntry, BodyMetric } from './types';

export class TrophiaDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  sessions!: Table<TrainingSession, string>;
  metrics!: Table<BodyMetric, string>;
  mutationQueue!: Table<MutationQueueEntry, string>;

  constructor() {
    super('trophia_db');

    // Versión 2: Compatibilidad con esquemas base antiguos
    this.version(2).stores({
      exercises: 'id, name, muscleGroup, updatedAt',
      routines: 'id, name, updatedAt',
      sessions: 'id, routineId, date, completed, deletedAt, updatedAt',
      metrics: 'id, date, updatedAt',
      mutationQueue: 'id, synced, createdAt',
    });

    // Versión 3: Incorporación de índices userId principales
    this.version(3).stores({
      exercises: 'id, userId, name, muscleGroup, updatedAt',
      routines: 'id, userId, name, updatedAt',
      sessions: 'id, userId, routineId, date, completed, deletedAt, updatedAt',
      metrics: 'id, userId, date, updatedAt',
      mutationQueue: 'id, synced, createdAt',
    });

    // Versión 4: Robustez multi-usuario (Soporte para propiedades userId y user_id simultáneamente)
    this.version(4).stores({
      exercises: 'id, userId, user_id, name, muscleGroup, updatedAt',
      routines: 'id, userId, user_id, name, updatedAt',
      sessions: 'id, userId, user_id, routineId, date, completed, deletedAt, updatedAt',
      metrics: 'id, userId, user_id, date, updatedAt',
      mutationQueue: 'id, userId, synced, createdAt',
    });
  }
}

export const db = new TrophiaDatabase();
