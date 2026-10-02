import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

declare global {
  // eslint-disable-next-line no-var
  var __supabaseClientInstance: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClientInstance ||
  createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

if (import.meta.env.DEV || typeof window !== 'undefined') {
  globalThis.__supabaseClientInstance = supabase;
}
