import { db } from './db';
import { supabase } from './supabase';
import { uuid, now } from './uuid';
import type { MutationOp, MutationQueueEntry, Exercise, Routine, TrainingSession } from './types';

type SyncTable = 'exercises' | 'routines' | 'sessions';

function getCurrentUserId(): string | null {
  try {
    const stored = localStorage.getItem('ironlog-session');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

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

function localToRemote(table: SyncTable, record: Record<string, unknown>, userId: string | null): Record<string, unknown> {
  const baseData = {
    user_id: userId,
  };

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
      exercises: JSON.stringify(r.exercises),
      created_at: new Date(r.createdAt).toISOString(),
      updated_at: new Date(r.updatedAt).toISOString(),
    };
  }
  const s = record as unknown as TrainingSession;
  return {
    ...baseData,
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
  const userId = getCurrentUserId();
  const pending = await db.mutations.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;
  let pushed = 0;

  for (const entry of pending) {
    const { op } = entry;
    try {
      if (op.kind === 'upsert') {
        const remoteRow = localToRemote(op.table, op.record, userId);
        const { error } = await supabase.from(op.table).upsert(remoteRow);
        if (error) throw error;
      } else if (op.kind === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        if (error) throw error;
      }
      await db.mutations.update(entry.id, { synced: 1 });
      pushed++;
    } catch {
      break;
    }
  }
  return pushed;
}

async function pullTable(table: SyncTable): Promise<number> {
  const userId = getCurrentUserId();
  if (!userId) return 0;

  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
  if (error || !data) return 0;

  const pendingMutations = await db.mutations.where('synced').equals(0).toArray();
  
  const pendingDeleteIds = new Set(
    pendingMutations
      .filter((m) => m.op.kind === 'delete' && m.op.table === table)
      .map((m) => (m.op as Extract<MutationOp, { kind: 'delete' }>).id)
  );

  const pendingUpsertIds = new Set(
    pendingMutations
      .filter((m) => m.op.kind === 'upsert' && m.op.table === table)
      .map((m) => ((m.op as Extract<MutationOp, { kind: 'upsert' }>).record as { id: string }).id)
  );

  const dexieTable = db.table(table);
  let pulled = 0;

  for (const row of data) {
    const localRecord = remoteToLocal(table, row as Record<string, unknown>);
    const id = localRecord.id as string;

    if (pendingDeleteIds.has(id)) {
      continue;
    }

    const existing = await dexieTable.get(id);
    const localDeletedAt = existing ? (existing as { deletedAt?: number }).deletedAt : undefined;

    // Si el registro está en la papelera localmente, protegemos el estado y la nube no lo sobrescribe
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

  const remoteIds = new Set(data.map((r) => (r as { id: string }).id));
  const allLocal = await dexieTable.toArray();

  for (const localRow of allLocal) {
    const localId = (localRow as { id: string }).id;
    const localDeletedAt = (localRow as { deletedAt?: number }).deletedAt;
    
    if (!remoteIds.has(localId)) {
      // Si no está en remoto y no tiene cambios pendientes NI está en la papelera, se elimina localmente
      if (!pendingUpsertIds.has(localId) && !localDeletedAt) {
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
