import Dexie, { type Table } from 'dexie';
import type { Exercise, Routine, TrainingSession, MutationQueueEntry } from './types';

export class IronlogDB extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  sessions!: Table<TrainingSession, string>;
  mutations!: Table<MutationQueueEntry, string>;

  constructor() {
    super('ironlog-db');
    this.version(1).stores({
      exercises: 'id, name, muscleGroup, updatedAt',
      routines: 'id, name, updatedAt',
      sessions: 'id, routineId, date, completed, updatedAt',
      mutations: 'id, synced, createdAt',
    });
    this.version(2).stores({
      exercises: 'id, name, muscleGroup, updatedAt',
      routines: 'id, name, updatedAt',
      sessions: 'id, routineId, date, completed, updatedAt',
      mutations: 'id, synced, createdAt',
    });
  }
}

export const db = new IronlogDB();
