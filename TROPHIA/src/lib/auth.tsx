import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
// REMOVIDO: seedExercises para evitar la inyección de ejercicios globales o compartidos
import { startSyncLoop, pendingCount, flush } from './sync';
import { db } from './db';

export interface SupabaseUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: SupabaseUser | null;
  ready: boolean;
  pendingMutations: number;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createUser: (data: { name: string; username: string; password: string; role: 'admin' | 'user' }) => Promise<void>;
  updateUser: (id: string, data: Partial<Pick<SupabaseUser, 'name' | 'username' | 'password' | 'role'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = 'ironlog-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [ready, setReady] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        // ELIMINADO: seedExercises() ya no se ejecuta al iniciar la app
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SupabaseUser;
          if (parsed && parsed.id && isMounted) {
            setUser(parsed);
          }

          const { data } = await supabase.from('users').select('*').eq('id', parsed.id).maybeSingle();
          if (data && isMounted) {
            setUser(data as SupabaseUser);
            localStorage.setItem(SESSION_KEY, JSON.stringify(data));
          }
          await flush().catch(() => {});
        }
      } catch {
        // Mantiene la sesión local activa en caso de fallo de red
      } finally {
        if (isMounted) setReady(true);
      }
    })();

    const updatePending = () => {
      pendingCount().then((n) => isMounted && setPendingMutations(n)).catch(() => {});
    };

    const stopSync = startSyncLoop(updatePending);
    updatePending();

    return () => {
      isMounted = false;
      stopSync();
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();

      if (error || !data) return false;

      const userData = data as SupabaseUser;
      setUser(userData);
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
      
      await flush().catch(() => {});
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    // AÑADIDO: db.exercises.clear() para limpiar ejercicios locales al cerrar sesión
    await Promise.all([
      db.exercises.clear(),
      db.routines.clear(),
      db.sessions.clear(),
      db.metrics.clear(),
      db.mutationQueue.clear(),
    ]).catch(() => {});
  }, []);

  const createUser = useCallback(async (data: { name: string; username: string; password: string; role: 'admin' | 'user' }) => {
    const { error } = await supabase.from('users').insert({
      name: data.name.trim(),
      username: data.username.trim(),
      password: data.password,
      role: data.role,
    });
    if (error) throw new Error(error.message);
  }, []);

  const updateUser = useCallback(async (id: string, data: Partial<Pick<SupabaseUser, 'name' | 'username' | 'password' | 'role'>>) => {
    const update: Record<string, string> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.username !== undefined) update.username = data.username.trim();
    if (data.password !== undefined) update.password = data.password;
    if (data.role !== undefined) update.role = data.role;

    const { error } = await supabase.from('users').update(update).eq('id', id);
    if (error) throw new Error(error.message);

    if (user?.id === id) {
      const { data: fresh } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (fresh) {
        setUser(fresh as SupabaseUser);
        localStorage.setItem(SESSION_KEY, JSON.stringify(fresh));
      }
    }
  }, [user?.id]);

  const deleteUser = useCallback(async (id: string) => {
    await Promise.all([
      supabase.from('exercises').delete().eq('user_id', id),
      supabase.from('routines').delete().eq('user_id', id),
      supabase.from('sessions').delete().eq('user_id', id),
      supabase.from('metrics').delete().eq('user_id', id),
    ]).catch(() => {});

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await Promise.all([
      db.exercises.clear(),
      db.routines.clear(),
      db.sessions.clear(),
      db.metrics.clear(),
      db.mutationQueue.clear(),
    ]).catch(() => {});

    if (user?.id === id) { 
      setUser(null); 
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user?.id]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    pendingMutations,
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
  }), [user, ready, pendingMutations, login, logout, createUser, updateUser, deleteUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
