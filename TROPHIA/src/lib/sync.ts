import { db } from './db';
import { supabase } from './supabase';
import { uuid, now } from './uuid';
import type { Exercise, Routine, TrainingSession, BodyMetric } from './types';

export type SyncTable = 'exercises' | 'routines' | 'sessions' | 'metrics';

// Definimos la estructura de la mutación localmente para evitar conflictos con types.ts
export type MutationOp = 
  | { kind: 'upsert'; table: SyncTable; record: Record<string, unknown> }
  | { kind: 'delete'; table: SyncTable; id: string };

async function getCurrentUserId(): Promise<string | null> {
  try {
    const stored = localStorage.getItem('ironlog-session');
    if (!stored) return null;
    const { id } = JSON.parse(stored) as { id: string };
    return id ?? null;
  } catch {
    return null;
  }
}

export async function enqueue(op: MutationOp): Promise<void> {
  const entry = { id: uuid(), op, createdAt: now(), synced: 0 } as any;
  await db.mutationQueue.add(entry);
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
  const finalUserId = (record.userId as string) || (record.user_id as string) || userId;
  const baseData = finalUserId ? { user_id: finalUserId } : {};

  if (table === 'exercises') {
    const e = record as any;
    return {
      ...baseData,
      id: e.id,
      name: e.name,
      muscle_group: e.muscleGroup,
      notes: e.notes ?? null,
      created_at: new Date(e.createdAt || Date.now()).toISOString(),
      updated_at: new Date(e.updatedAt || Date.now()).toISOString(),
    };
  }
  if (table === 'routines') {
    const r = record as any;
    return {
      ...baseData,
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      exercises: r.exercises,
      created_at: new Date(r.createdAt || Date.now()).toISOString(),
      updated_at: new Date(r.updatedAt || Date.now()).toISOString(),
    };
  }
  if (table === 'sessions') {
    const s = record as any;
    return {
      ...baseData,
      id: s.id,
      routine_id: s.routineId,
      routine_name: s.routineName,
      date: s.date,
      exercises: s.exercises,
      notes: s.notes ?? null,
      completed: s.completed,
      created_at: new Date(s.createdAt || Date.now()).toISOString(),
      updated_at: new Date(s.updatedAt || Date.now()).toISOString(),
    };
  }

  const m = record as any;
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
    updated_at: m.updatedAt ? new Date(m.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function remoteToLocal(table: SyncTable, row: Record<string, unknown>): Record<string, unknown> {
  const userId = (row.user_id as string) ?? undefined;

  if (table === 'exercises') {
    return {
      id: row.id,
      userId,
      name: row.name,
      muscleGroup: row.muscle_group,
      notes: row.notes ?? undefined,
      createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    };
  }
  if (table === 'routines') {
    return {
      id: row.id,
      userId,
      name: row.name,
      description: row.description ?? undefined,
      exercises: parseJsonField(row.exercises),
      createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    };
  }
  if (table === 'sessions') {
    return {
      id: row.id,
      userId,
      routineId: row.routine_id ?? null,
      routineName: row.routine_name,
      date: row.date,
      exercises: parseJsonField(row.exercises),
      notes: row.notes ?? undefined,
      completed: row.completed,
      createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
    };
  }

  return {
    id: row.id,
    userId,
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
    updatedAt: row.updated_at ? new Date(row.updated_at as string).getTime() : Date.now(),
  };
}

async function pushPending(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const pending = await db.mutationQueue.where('synced').equals(0).toArray();
  if (pending.length === 0) return 0;
  let pushed = 0;

  for (const rawEntry of pending) {
    const entry = rawEntry as any;
    const op = entry.op as MutationOp;
    try {
      if (op.kind === 'upsert') {
        const remoteRow = localToRemote(op.table as SyncTable, op.record, userId);
        const { error } = await supabase.from(op.table).upsert(remoteRow);
        if (error) throw error;
      } else if (op.kind === 'delete') {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id);
        if (error) throw error;
      }
      await db.mutationQueue.update(entry.id, { synced: 1 } as any);
      pushed++;
    } catch {
      break;
    }
  }
  return pushed;
}

async function pullTable(table: SyncTable): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  let query = supabase.from(table).select('*');
  if (table === 'exercises') {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error || !data) return 0;

  const pendingMutations = await db.mutationQueue.where('synced').equals(0).toArray();

  const pendingDeleteIds = new Set(
    pendingMutations
      .filter((m: any) => m.op?.kind === 'delete' && m.op?.table === table)
      .map((m: any) => m.op?.id)
  );

  const pendingUpsertIds = new Set(
    pendingMutations
      .filter((m: any) => m.op?.kind === 'upsert' && m.op?.table === table)
      .map((m: any) => m.op?.record?.id)
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
  total += await pullTable('exercises').catch(() => 0);
  total += await pullTable('routines').catch(() => 0);
  total += await pullTable('sessions').catch(() => 0);
  total += await pullTable('metrics').catch(() => 0);
  return total;
}

export async function flush(): Promise<{ pushed: number; pulled: number }> {
  if (!isOnline()) return { pushed: 0, pulled: 0 };
  const pushed = await pushPending().catch(() => 0);
  const pulled = await pullAll().catch(() => 0);
  return { pushed, pulled };
}

let activeInterval: number | null = null;

export function startSyncLoop(onChange?: () => void): () => void {
  if (activeInterval !== null) {
    window.clearInterval(activeInterval);
    activeInterval = null;
  }

  const tick = () => {
    flush()
      .then(({ pushed, pulled }) => {
        if ((pushed > 0 || pulled > 0) && onChange) onChange();
      })
      .catch(() => {});
  };

  const onlineHandler = () => tick();
  window.addEventListener('online', onlineHandler);
  
  activeInterval = window.setInterval(tick, 10000);
  tick();

  return () => {
    if (activeInterval !== null) {
      window.clearInterval(activeInterval);
      activeInterval = null;
    }
    window.removeEventListener('online', onlineHandler);
  };
}
