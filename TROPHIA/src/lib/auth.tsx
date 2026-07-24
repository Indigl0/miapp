
/*
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { db } from './db';
import { seedExercises } from './seed';
import { startSyncLoop, pendingCount } from './sync';

export interface SupabaseUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: SupabaseUser | null;
  ready: boolean;
  pendingMutations: number;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
    (async () => {
      await seedExercises();
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const { id } = JSON.parse(stored) as { id: string };
          const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
          if (data) setUser(data as SupabaseUser);
        } catch { localStorage.removeItem(SESSION_KEY); }
      }
      setReady(true);
    })();

    const stop = startSyncLoop(() => {
      pendingCount().then((n) => setPendingMutations(n)).catch(() => {});
    });
    pendingCount().then((n) => setPendingMutations(n)).catch(() => {});
    return stop;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, ready, pendingMutations,
    login: async (username, password) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();
      if (error || !data) return false;
      setUser(data as SupabaseUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.id }));
      return true;
    },
    logout: () => {
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
    },
    createUser: async (data) => {
      const { error } = await supabase.from('users').insert({
        name: data.name.trim(),
        username: data.username.trim(),
        password: data.password,
        role: data.role,
      });
      if (error) throw new Error(error.message);
    },
    updateUser: async (id, data) => {
      const update: Record<string, string> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) update.name = data.name.trim();
      if (data.username !== undefined) update.username = data.username.trim();
      if (data.password !== undefined) update.password = data.password;
      if (data.role !== undefined) update.role = data.role;
      const { error } = await supabase.from('users').update(update).eq('id', id);
      if (error) throw new Error(error.message);
      if (user?.id === id) {
        const { data: fresh } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (fresh) setUser(fresh as SupabaseUser);
      }
    },
    deleteUser: async (id) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(error.message);
      if (user?.id === id) { setUser(null); localStorage.removeItem(SESSION_KEY); }
    },
  }), [user, ready, pendingMutations]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

*/




import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { db } from './db';
import { seedExercises } from './seed';
import { startSyncLoop, pendingCount } from './sync';

export interface SupabaseUser {
  id: string;
  name: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: SupabaseUser | null;
  ready: boolean;
  pendingMutations: number;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
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
    (async () => {
      await seedExercises();
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const { id } = JSON.parse(stored) as { id: string };
          const { data } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
          if (data) setUser(data as SupabaseUser);
        } catch { localStorage.removeItem(SESSION_KEY); }
      }
      setReady(true);
    })();

    const stop = startSyncLoop(() => {
      pendingCount().then((n) => setPendingMutations(n)).catch(() => {});
    });
    pendingCount().then((n) => setPendingMutations(n)).catch(() => {});
    return stop;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, ready, pendingMutations,
    login: async (username, password) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim())
        .eq('password', password)
        .maybeSingle();
      if (error || !data) return false;
      setUser(data as SupabaseUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.id }));
      return true;
    },
    logout: () => {
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
      // Limpiar base de datos local para que no queden datos de otro usuario
      db.exercises.clear();
      db.routines.clear();
      db.sessions.clear();
    },
    createUser: async (data) => {
      const { error } = await supabase.from('users').insert({
        name: data.name.trim(),
        username: data.username.trim(),
        password: data.password,
        role: data.role,
      });
      if (error) throw new Error(error.message);
    },
    updateUser: async (id, data) => {
      const update: Record<string, string> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) update.name = data.name.trim();
      if (data.username !== undefined) update.username = data.username.trim();
      if (data.password !== undefined) update.password = data.password;
      if (data.role !== undefined) update.role = data.role;
      const { error } = await supabase.from('users').update(update).eq('id', id);
      if (error) throw new Error(error.message);
      if (user?.id === id) {
        const { data: fresh } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
        if (fresh) setUser(fresh as SupabaseUser);
      }
    },
    deleteUser: async (id) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(error.message);
      if (user?.id === id) { 
        setUser(null); 
        localStorage.removeItem(SESSION_KEY); 
        db.exercises.clear();
        db.routines.clear();
        db.sessions.clear();
      }
    },
  }), [user, ready, pendingMutations]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}