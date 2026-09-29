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

    this.version(2).stores({
      exercises: 'id, name, muscleGroup, updatedAt',
      routines: 'id, name, updatedAt',
      sessions: 'id, routineId, date, completed, deletedAt, updatedAt',
      metrics: 'id, date, updatedAt',
      mutationQueue: 'id, synced, createdAt',
    });
  }
}

export const db = new TrophiaDatabase();
