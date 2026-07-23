import { db } from './db';
import { supabase } from './supabase';
import { uuid, now } from './uuid';
import type { MutationOp, MutationQueueEntry, Exercise, Routine, TrainingSession } from './types';

type SyncTable = 'exercises' | 'routines' | 'sessions';

export async function enqueue(op: MutationOp): Promise<void> {
  const entry: MutationQueueEntry = { id: uuid(), op, createdAt: now(), synced: 0 };
  await db.mutations.add(entry);
}

export async function pendingCount(): Promise<number> {
  return db.mutations.where('synced').equals(0).count();
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

// ─── Push: send local pending mutations to Supabase ───

function localToRemote(table: SyncTable, record: Record<string, unknown>): Record<string, unknown> {
  if (table === 'exercises') {
    const e = record as unknown as Exercise;
    return {
      id: e.id,
      name: e.name,
      muscle_group: e.muscleGroup,
      notes: e.notes ?? null,
      created_at: new Date(e.createdAt).toISOString(),
      updated_at: new Date(e.updatedAt).toISOString(),
    };
  }
  if (table === 'routines') {
    const r = record as unknown as Routine;
    return {
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      exercises: JSON.stringify(r.exercises),
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    };
  }
  // sessions
  const s = record as unknown as TrainingSession;
  return {
    id: s.id,
    routine_id: s.routineId,
    routine_name: s.routineName,
    date: s.date,
    exercises: JSON.stringify(s.exercises),
    notes: s.notes ?? null,
    completed: s.completed,
    created_at: new Date(s.createdAt).toISOString(),
    updated_at: new Date(s.updatedAt).toISOString(),
  };
}

function remoteToLocal(table: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  if (table === 'exercises') {
    return {
      id: row.id,
      name: row.name,
      muscleGroup: row.muscle_group,
      notes: row.notes ?? undefined,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
    } as Record<string, unknown>;
  }
  if (table === 'routines') {
    const exercises = typeof row.exercises === 'string' ? JSON.parse(row.exercises as string) : (row.exercises ?? []);
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      exercises,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
    } as Record<string, unknown>;
  }
  // sessions
  const exercises = typeof row.exercises === 'string' ? JSON.parse(row.exercises as string) : (row.exercises ?? []);
  return {
    id: row.id,
    routineId: row.routine_id ?? null,
    routineName: row.routine_name,
    date: row.date,
    exercises,
    notes: row.notes ?? undefined,
    completed: row.completed,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  } as Record<string, unknown>;
}

async function pushPending(): Promise<number> {
  const pending = await db.mutations.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;
  let pushed = 0;

  for (const entry of pending) {
    const { op } = entry;
    try {
      if (op.kind === 'upsert') {
        const remoteRow = localToRemote(op.table, op.record);
        const { error } = await supabase.from(op.table).upsert(remoteRow);
        if (error) throw error;
      } else if (op.kind === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        if (error) throw error;
      }
      await db.mutations.update(entry.id, { synced: 1 });
      pushed++;
    } catch {
      // Stop on first error — will retry next cycle
      break;
    }
  }
  return pushed;
}

// ─── Pull: download remote changes into local Dexie ───

async function pullTable(table: SyncTable): Promise<number> {
  const { data, error } = await supabase.from(table).select('*');
  if (error || !data) return 0;

  const dexieTable = db.table(table);
  let pulled = 0;

  for (const row of data) {
    const localRecord = remoteToLocal(table, row as Record<string, unknown>);
    const id = localRecord.id as string;
    const remoteUpdatedAt = localRecord.updatedAt as number;

    const existing = await dexieTable.get(id);
    if (!existing) {
      await dexieTable.put(localRecord);
      pulled++;
    } else {
      const localUpdatedAt = (existing as { updatedAt?: number }).updatedAt ?? 0;
      if (remoteUpdatedAt > localUpdatedAt) {
        await dexieTable.put(localRecord);
        pulled++;
      }
    }
  }

  // Detect remote deletes: find local rows not in remote data
  const remoteIds = new Set(data.map((r) => (r as { id: string }).id));
  const allLocal = await dexieTable.toArray();
  for (const localRow of allLocal) {
    const localId = (localRow as { id: string }).id;
    if (!remoteIds.has(localId)) {
      // Check if this row was created locally and not yet pushed (still in mutation queue)
      const hasPending = await db.mutations
        .where('synced').equals(0)
        .filter((m) => m.op.kind === 'upsert' && m.op.table === table && (m.op.record as { id: string }).id === localId)
        .count();
      if (hasPending === 0) {
        await dexieTable.delete(localId);
        pulled++;
      }
    }
  }

  return pulled;
}

async function pullAll(): Promise<number> {
  let total = 0;
  total += await pullTable('exercises');
  total += await pullTable('routines');
  total += await pullTable('sessions');
  return total;
}

// ─── Full sync cycle: push then pull ───

export async function flush(): Promise<{ pushed: number; pulled: number }> {
  if (!isOnline()) return { pushed: 0, pulled: 0 };
  const pushed = await pushPending();
  const pulled = await pullAll();
  return { pushed, pulled };
}

let listening = false;
export function startSyncLoop(onChange?: () => void): () => void {
  if (listening) return () => {};
  listening = true;

  const tick = () => {
    flush()
      .then(({ pushed, pulled }) => {
        if ((pushed > 0 || pulled > 0) && onChange) onChange();
      })
      .catch(() => {});
  };

  const onlineHandler = () => tick();
  window.addEventListener('online', onlineHandler);
  const interval = window.setInterval(tick, 15000);
  tick();

  return () => {
    listening = false;
    window.removeEventListener('online', onlineHandler);
    window.clearInterval(interval);
  };
}
