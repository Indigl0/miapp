import { db } from './db';
import { supabase } from './supabase';
import { uuid, now } from './uuid';
import type { MutationOp, MutationQueueEntry, Exercise, Routine, TrainingSession, BodyMetric } from './types';

export type SyncTable = 'exercises' | 'routines' | 'sessions' | 'metrics';

async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function enqueue(op: MutationOp): Promise<void> {
  const entry: MutationQueueEntry = { id: uuid(), op, createdAt: now(), synced: 0 };
  await db.mutationQueue.add(entry);
  // Intentar sincronizar de inmediato al encolar
  flush().catch(() => {});
}

export async function pendingCount(): Promise<number> {
  return db.mutationQueue.where('synced').equals(0).count();
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function parseJsonField<T>(field: unknown): T {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return [] as unknown as T;
    }
  }
  return (field ?? []) as T;
}

function localToRemote(table: SyncTable, record: Record<string, unknown>, userId: string | null): Record<string, unknown> {
  const baseData = userId ? { user_id: userId } : {};

  if (table === 'exercises') {
    const e = record as unknown as Exercise;
    return {
      ...baseData,
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
      ...baseData,
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      exercises: r.exercises,
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    };
  }
  if (table === 'sessions') {
    const s = record as unknown as TrainingSession;
    return {
      ...baseData,
      id: s.id,
      routine_id: s.routineId,
      routine_name: s.routineName,
      date: s.date,
      exercises: s.exercises,
      notes: s.notes ?? null,
      completed: s.completed,
      created_at: new Date(s.createdAt).toISOString(),
      updated_at: new Date(s.updatedAt).toISOString(),
    };
  }

  const m = record as unknown as BodyMetric;
  return {
    ...baseData,
    id: m.id,
    date: m.date,
    weight_kg: m.weightKg ?? null,
    body_fat_percentage: m.bodyFatPercentage ?? null,
    chest_cm: m.chestCm ?? null,
    waist_cm: m.waistCm ?? null,
    hips_cm: m.hipsCm ?? null,
    biceps_cm: m.bicepsCm ?? null,
    thighs_cm: m.thighsCm ?? null,
    notes: m.notes ?? null,
    created_at: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
    updated_at: new Date(m.updatedAt).toISOString(),
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
    };
  }
  if (table === 'routines') {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      exercises: parseJsonField(row.exercises),
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
    };
  }
  if (table === 'sessions') {
    return {
      id: row.id,
      routineId: row.routine_id ?? null,
      routineName: row.routine_name,
      date: row.date,
      exercises: parseJsonField(row.exercises),
      notes: row.notes ?? undefined,
      completed: row.completed,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
    };
  }

  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg ?? undefined,
    bodyFatPercentage: row.body_fat_percentage ?? undefined,
    chestCm: row.chest_cm ?? undefined,
    waistCm: row.waist_cm ?? undefined,
    hipsCm: row.hips_cm ?? undefined,
    bicepsCm: row.biceps_cm ?? undefined,
    thighsCm: row.thighs_cm ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

async function pushPending(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const pending = await db.mutationQueue.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;
  let pushed = 0;

  for (const entry of pending) {
    const { op } = entry;
    try {
      if (op.kind === 'upsert') {
        const remoteRow = localToRemote(op.table as SyncTable, op.record, userId);
        const { error } = await supabase.from(op.table).upsert(remoteRow);
        if (error) {
          console.error(`Error upserting to ${op.table}:`, error);
          throw error;
        }
      } else if (op.kind === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        if (error) {
          console.error(`Error deleting from ${op.table}:`, error);
          throw error;
        }
      }
      await db.mutationQueue.update(entry.id, { synced: 1 });
      pushed++;
    } catch (e) {
      console.error('Failed to push mutation entry:', entry, e);
      break;
    }
  }
  return pushed;
}

async function pullTable(table: SyncTable): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
  if (error || !data) return 0;

  const pendingMutations = await db.mutationQueue.where('synced').equals(0).toArray();

  const pendingDeleteIds = new Set(
    pendingMutations
      .filter((m: MutationQueueEntry) => m.op.kind === 'delete' && m.op.table === table)
      .map((m: MutationQueueEntry) => (m.op as Extract<MutationOp, { kind: 'delete' }>).id)
  );

  const pendingUpsertIds = new Set(
    pendingMutations
      .filter((m: MutationQueueEntry) => m.op.kind === 'upsert' && m.op.table === table)
      .map((m: MutationQueueEntry) => ((m.op as Extract<MutationOp, { kind: 'upsert' }>).record as { id: string }).id)
  );

  const dexieTable = db.table(table);
  let pulled = 0;

  for (const row of data) {
    const localRecord = remoteToLocal(table, row as Record<string, unknown>);
    const id = localRecord.id as string;

    if (pendingDeleteIds.has(id) || pendingUpsertIds.has(id)) {
      continue;
    }

    const existing = await dexieTable.get(id);
    const localDeletedAt = existing ? (existing as { deletedAt?: number }).deletedAt : undefined;

    if (localDeletedAt) {
      continue;
    }

    const remoteUpdatedAt = localRecord.updatedAt as number;

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

  return pulled;
}

async function pullAll(): Promise<number> {
  let total = 0;
  total += await pullTable('exercises');
  total += await pullTable('routines');
  total += await pullTable('sessions');
  total += await pullTable('metrics');
  return total;
}

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
  const interval = window.setInterval(tick, 10000);
  tick();

  return () => {
    listening = false;
    window.removeEventListener('online', onlineHandler);
    window.clearInterval(interval);
  };
}
